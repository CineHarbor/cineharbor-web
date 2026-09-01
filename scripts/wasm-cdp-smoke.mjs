// 端到端验证：真实 headless Chrome 里加载 module Worker（/core-worker.js → --target web glue），
// 通过 wasm core 直连 mock addon，跑通四桥（core_version / manifest / catalog / meta / streams）。
//
// 依赖：Chrome（Google Chrome.app）+ node 22（globalThis.WebSocket）。运行：
//   node scripts/wasm-cdp-smoke.mjs
// 成功 stdout 输出 `SMOKE_RESULT={...}`，失败输出诊断并以非 0 退出。

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

const EXPRESSION = `(async () => {
  const base = location.origin + "/mock-addon";
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
  let addonResult;
  try {
    const version = await post(worker, "core_version", []);
    const manifest = JSON.parse(await post(worker, "manifest", [base]));
    const catalog = JSON.parse(await post(worker, "catalog", [base, "movie", "top", null, null, null]));
    const meta = JSON.parse(await post(worker, "meta", [base, "movie", "movie1"]));
    const streams = JSON.parse(await post(worker, "streams", [base, "movie", "movie1"]));

    // IndexedDB：set → get → remove → 缺键 null
    await post(worker, "storage_set", ["k", "v1"]);
    const getAfterSet = await post(worker, "storage_get", ["k"]);
    await post(worker, "storage_remove", ["k"]);
    const getAfterRemove = await post(worker, "storage_get", ["k"]);
    await post(worker, "storage_set", ["persist", "P123"]);

    addonResult = {
      version,
      manifestId: manifest.id,
      catalogCount: catalog.metas.length,
      metaName: meta.meta.name,
      streamName: streams.streams[0].name,
      streamUrl: streams.streams[0].url,
      getAfterSet,
      getAfterRemove,
    };
  } finally {
    worker.terminate();
  }

  // 换一个全新 worker，验证写入跨 worker 持久化（同一 IndexedDB「cineharbor」）
  const worker2 = new Worker("/core-worker.js", { type: "module" });
  try {
    return { ...addonResult, persist: await post(worker2, "storage_get", ["persist"]) };
  } finally {
    worker2.terminate();
  }
})()`;

async function main() {
  const { child: server, port } = await spawnServer();
  const userDataDir = mkdtempSync(path.join(tmpdir(), "ch-smoke-"));
  const chrome = launchChrome(userDataDir);

  try {
    const debugPort = await readDevToolsPort(userDataDir);
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
    const page = targets.find((t) => t.type === "page");
    if (!page) throw new Error("no page target");

    const ws = await wsConnect(page.webSocketDebuggerUrl);
    const cdp = new Cdp(ws);
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url: `http://127.0.0.1:${port}/` });
    await Promise.race([loaded, sleep(8000)]);

    const evaluation = await cdp.send("Runtime.evaluate", {
      expression: EXPRESSION,
      awaitPromise: true,
      returnByValue: true,
    });
    if (evaluation.exceptionDetails) {
      throw new Error(
        `evaluate failed: ${JSON.stringify(evaluation.exceptionDetails)}`,
      );
    }
    console.log(`SMOKE_RESULT=${JSON.stringify(evaluation.result.value)}`);
    ws.close();
  } finally {
    chrome.kill("SIGKILL");
    server.kill("SIGTERM");
    await sleep(100);
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`SMOKE_FAILED: ${error.message}`);
  process.exit(1);
});