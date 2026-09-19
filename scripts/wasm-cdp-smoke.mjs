import assert from 'node:assert/strict';
import {
  sleep,
  spawnServer,
  launchChrome,
  readDevToolsPort,
  Cdp,
  wsConnect,
} from './smoke-tools.mjs';
// 端到端验证：真实 headless Chrome 里加载 module Worker（/core-worker.js → --target web glue），
// 通过 wasm core 直连 mock addon，跑通四桥（core_version / manifest / catalog / meta / streams）。
//
// 依赖：Chrome/Chromium（支持 CHROME_PATH）+ node 22（globalThis.WebSocket）。运行：
//   node scripts/wasm-cdp-smoke.mjs
// 成功 stdout 输出 `SMOKE_RESULT={...}`，失败输出诊断并以非 0 退出。

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

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
  const userDataDir = mkdtempSync(path.join(tmpdir(), 'ch-smoke-'));
  const chrome = launchChrome(userDataDir);

  try {
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
      cdp.send('Page.navigate', { url: `http://127.0.0.1:${port}/` }),
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
    assert.equal(
      result.version,
      JSON.parse(
        readFileSync(path.join(webRoot, 'public/wasm/build-info.json'), 'utf8')
      ).version
    );
    assert.equal(result.manifestId, 'mock');
    assert.equal(result.catalogCount, 1);
    assert.equal(result.metaName, 'Test Movie');
    assert.equal(result.streamName, 'Demo');
    assert.equal(result.streamUrl, 'http://example.test/demo.m3u8');
    assert.equal(result.getAfterSet, 'v1');
    assert.equal(result.getAfterRemove, null);
    assert.equal(result.persist, 'P123');
    console.log(`SMOKE_RESULT=${JSON.stringify(evaluation.result.value)}`);
    ws.close();
  } finally {
    chrome.kill('SIGKILL');
    server.kill('SIGTERM');
    await sleep(100);
    rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`SMOKE_FAILED: ${error.message}`);
  process.exit(1);
});
