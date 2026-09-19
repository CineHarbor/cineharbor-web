import assert from 'node:assert/strict';
import {
  sleep,
  waitForUrl,
  spawnServer,
  spawnRustAddon,
  launchChrome,
  readDevToolsPort,
  Cdp,
  wsConnect,
} from './smoke-tools.mjs';
// 端到端验证（douban 交叉源）：真实 headless Chrome 里从 A 源页面直连 B 源真实 douban addon :11471，
// 走 worker→wasm→fetch 管线，对 mock 豆瓣搜索站（`window.__DATA__` HTML）完成 catalog(search)，
// 证明豆瓣 cutover 的跨源直连成立，并核验评分槽位（协议 `rating`）随 wasm 重序列化透传。
//
// 依赖：Chrome + node 22 + cargo（douban addon）。运行：node scripts/douban-cross-origin-smoke.mjs
// 成功 stdout 输出 `DOUBAN_CROSS_ORIGIN_RESULT={...}`，失败非 0 退出。

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const addonSdkRoot = path.resolve(webRoot, '..', 'cineharbor-addon-sdk');

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
      response.setHeader('content-type', 'text/html; charset=utf-8');
      response.end(html);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function spawnDoubanAddon(searchBaseUrl) {
  return spawnRustAddon('cineharbor-addon-douban', {
    root: addonSdkRoot,
    env: {
      CINEHARBOR_ADDON_PORT: String(ADDON_PORT),
      CINEHARBOR_DOUBAN_SEARCH_BASE_URL: searchBaseUrl,
    },
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
    userDataDir = mkdtempSync(path.join(tmpdir(), 'ch-douban-smoke-'));
    const chromeProc = launchChrome(userDataDir);
    chrome.kill = () => chromeProc.kill('SIGKILL');

    const debugPort = await readDevToolsPort(userDataDir);
    const targets = await (
      await fetch(`http://127.0.0.1:${debugPort}/json`, {
        signal: AbortSignal.timeout(5_000),
      })
    ).json();
    const page = targets.find((t) => t.type === 'page');
    if (!page) throw new Error('no page target');

    const ws = await wsConnect(page.webSocketDebuggerUrl);
    const cdp = new Cdp(ws);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    const loaded = cdp.once('Page.loadEventFired');
    const [navigation] = await Promise.all([
      cdp.send('Page.navigate', { url: `http://127.0.0.1:${started.port}/` }),
      loaded,
    ]);
    if (navigation.errorText)
      throw new Error(`Browser navigation failed: ${navigation.errorText}`);

    const evaluation = await cdp.send('Runtime.evaluate', {
      expression: EXPRESSION,
      awaitPromise: true,
      returnByValue: true,
    });
    if (evaluation.exceptionDetails) {
      throw new Error(
        `evaluate failed: ${JSON.stringify(evaluation.exceptionDetails)}`
      );
    }
    const result = evaluation.result.value;
    assert.notEqual(result.pageOrigin, result.addonBase);
    assert.equal(result.manifestId, 'cineharbor.douban');
    assert.equal(result.catalogCount, 1);
    assert.equal(result.firstId, 'douban:3541415');
    assert.match(result.firstTitle, /星际穿越/);
    assert.equal(result.firstYear, '2014');
    // The shared protocol intentionally serializes rating as an optional string.
    assert.equal(typeof result.firstRating, 'string');
    assert.equal(result.firstRating, '9.4');
    console.log(
      `DOUBAN_CROSS_ORIGIN_RESULT=${JSON.stringify(evaluation.result.value)}`
    );
    ws.close();
  } finally {
    chrome.kill();
    addon.kill('SIGKILL');
    server?.kill('SIGTERM');
    mock.server.close();
    await sleep(150);
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`DOUBAN_CROSS_ORIGIN_FAILED: ${error.message}`);
  process.exit(1);
});
