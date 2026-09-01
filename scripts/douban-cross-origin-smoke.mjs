// 端到端验证（douban 交叉源）：真实 headless Chrome 里从 A 源页面直连 B 源真实 douban addon :11471，
// 走 worker→wasm→fetch 管线，对 mock 豆瓣搜索站（`window.__DATA__` HTML）完成 catalog(search)，
// 证明豆瓣 cutover 的跨源直连成立，并核验评分槽位（协议 `rating`）随 wasm 重序列化透传。
//
// 依赖：Chrome + node 22 + cargo（douban addon）。运行：node scripts/douban-cross-origin-smoke.mjs
// 成功 stdout 输出 `DOUBAN_CROSS_ORIGIN_RESULT={...}`，失败非 0 退出。

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const addonSdkRoot = path.resolve(webRoot, "..", "cineharbor-addon-sdk");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const CARGO_HOME = "/Users/jay/Code/CineHarbor/.cargo-home";
const CARGO = process.env.CARGO || "/Users/jay/.cargo/bin/cargo";
const ADDON_PORT = 11471;
const ADDON_BASE = `http://127.0.0.1:${ADDON_PORT}`;

// mock 豆瓣搜索站：返回带评分（rating.value）的 `window.__DATA__` HTML。
function buildMockDoubanHtml() {
  return `<!doctype html><html><head></head><body><script>
      window.__DATA__ = {"total": 1, "items": [
        {"tpl_name": "search_subject", "id": 3541415, "title": "星际穿越 Interstellar (2014)",
         "cover_url": "https://img.doubanio.com/view/p.jpg", "labels": [{"text": "电影"}],
         "rating": {"value": 9.4, "count": 800000}}
      ]};
    </script></body></html>`;
}

async function startMockDouban() {
  const html = buildMockDoubanHtml();
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(html);
    });
    server.listen(0, "127.0.0.1", () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUrl(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  throw new Error(`timed out waiting for ${url}`);
}

function spawnServer() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", ["scripts/wasm-smoke.mjs"], {
      cwd: webRoot,
      stdio: ["ignore", "pipe", "inherit"],
    });
    let buf = "";
    child.stdout.on("data", (chunk) => {
      buf += String(chunk);
      const m = buf.match(/SMOKE_PORT=(\d+)/);
      if (m) resolve({ child, port: Number(m[1]) });
    });
    child.on("exit", (code) => {
      if (code !== null && code !== 0 && !buf.includes("SMOKE_PORT")) {
        reject(new Error(`smoke server exited early: ${code}`));
      }
    });
  });
}

function spawnDoubanAddon(searchBaseUrl) {
  if (!existsSync(addonSdkRoot)) {
    throw new Error(`addon sdk root not found: ${addonSdkRoot}`);
  }
  const child = spawn(CARGO, ["run", "-p", "cineharbor-addon-douban"], {
    cwd: addonSdkRoot,
    stdio: ["ignore", "pipe", "inherit"],
    env: {
      ...process.env,
      CARGO_HOME,
      CINEHARBOR_ADDON_PORT: String(ADDON_PORT),
      CINEHARBOR_DOUBAN_SEARCH_BASE_URL: searchBaseUrl,
    },
  });
  child.on("error", (error) => {
    console.error(`DOUBAN_ADDON_SPAWN_ERROR: ${error.message} (cargo=${CARGO}, cwd=${addonSdkRoot})`);
  });
  return child;
}

function launchChrome(userDataDir) {
  return spawn(
    CHROME,
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-dev-shm-usage",
      "--remote-debugging-port=0",
      `--user-data-dir=${userDataDir}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
}

async function readDevToolsPort(userDataDir) {
  for (let i = 0; i < 100; i++) {
    const file = path.join(userDataDir, "DevToolsActivePort");
    if (existsSync(file)) {
      const [port] = readFileSync(file, "utf8").split("\n");
      return Number(port);
    }
    await sleep(50);
  }
  throw new Error("DevToolsActivePort not written");
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener("message", (ev) => this.onMessage(ev.data));
  }

  onMessage(raw) {
    const msg = JSON.parse(String(raw));
    if (msg.id) {
      const pending = this.pending.get(msg.id);
      if (pending) {
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(msg.error.message));
        else pending.resolve(msg.result);
      }
      return;
    }
    if (msg.method) {
      const handlers = this.listeners.get(msg.method) ?? [];
      for (const handler of handlers) handler(msg.params);
    }
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  once(method) {
    return new Promise((resolve) => {
      this.listeners.set(method, [...(this.listeners.get(method) ?? []), resolve]);
    });
  }
}

function wsConnect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.addEventListener("open", () => resolve(ws), { once: true });
    ws.addEventListener("error", () => reject(new Error("websocket connect failed")), {
      once: true,
    });
  });
}

const CROSS_ORIGIN_ADDON_BASE = ADDON_BASE;
const EXPRESSION = `(async () => {
  const base = ${JSON.stringify(CROSS_ORIGIN_ADDON_BASE)};
  function post(worker, op, args) {
    return new Promise((resolve, reject) => {
      const id = Math.floor(Math.random() * 1e9);
      const onMessage = (ev) => {
        if (!ev.data || ev.data.id !== id) return;
        worker.removeEventListener("message", onMessage);
        if (ev.data.ok) resolve(ev.data.value);
        else reject(new Error(ev.data.error));
      };
      worker.addEventListener("message", onMessage);
      worker.postMessage({ id, op, args });
    });
  }
  const worker = new Worker("/core-worker.js", { type: "module" });
  try {
    const manifest = JSON.parse(await post(worker, "manifest", [base]));
    const catalog = JSON.parse(await post(worker, "catalog", [base, "movie", "search", "search", "星际穿越", null]));
    const first = catalog.metas[0];
    return {
      pageOrigin: location.origin,
      addonBase: base,
      manifestId: manifest.id,
      catalogCount: catalog.metas.length,
      firstId: first && first.id,
      firstTitle: first && first.name,
      firstYear: first && first.year,
      firstRating: first && first.rating,
    };
  } finally {
    worker.terminate();
  }
})()`;

async function main() {
  const mock = await startMockDouban();
  const searchBase = `http://127.0.0.1:${mock.port}`;
  const addon = spawnDoubanAddon(searchBase);
  let server;
  let userDataDir;
  const chrome = { kill() {} };

  try {
    await waitForUrl(`${ADDON_BASE}/manifest.json`);
    const started = await spawnServer();
    server = started.child;
    userDataDir = mkdtempSync(path.join(tmpdir(), "ch-douban-smoke-"));
    const chromeProc = launchChrome(userDataDir);
    chrome.kill = () => chromeProc.kill("SIGKILL");

    const debugPort = await readDevToolsPort(userDataDir);
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("no page target");

    const ws = await wsConnect(page.webSocketDebuggerUrl);
    const cdp = new Cdp(ws);
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${started.port}/` });
    await Promise.race([loaded, sleep(8000)]);

    const evaluation = await cdp.send("Runtime.evaluate", {
      expression: EXPRESSION,
      awaitPromise: true,
      returnByValue: true,
    });
    if (evaluation.exceptionDetails) {
      throw new Error(`evaluate failed: ${JSON.stringify(evaluation.exceptionDetails)}`);
    }
    console.log(`DOUBAN_CROSS_ORIGIN_RESULT=${JSON.stringify(evaluation.result.value)}`);
    ws.close();
  } finally {
    chrome.kill();
    addon.kill("SIGKILL");
    server?.kill("SIGTERM");
    mock.server.close();
    await sleep(150);
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`DOUBAN_CROSS_ORIGIN_FAILED: ${error.message}`);
  process.exit(1);
});