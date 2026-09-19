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
// 端到端验证（交叉源）：真实 headless Chrome 里加载 module Worker（/core-worker.js → wasm core），
// 从 **A 源**（smoke 服务器）直连 **B 源**（真实 standalone live addon :11472），证明「浏览器 addon HTTP
// 直连」在跨源下成立（CORS + wasm fetch 管线）。同时跑真实 M3U 摄入后的 catalog/meta/streams。
//
// 依赖：Chrome/Chromium（支持 CHROME_PATH）+ node 22（globalThis.WebSocket）+ cargo（live addon）。
// 运行：node scripts/addon-cross-origin-smoke.mjs
// 成功 stdout 输出 `CROSS_ORIGIN_RESULT={...}`，失败输出诊断并以非 0 退出。

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const addonSdkRoot = path.resolve(webRoot, '..', 'cineharbor-addon-sdk');

const ADDON_PORT = 11472;
const ADDON_BASE = `http://127.0.0.1:${ADDON_PORT}`;

const PLAYLIST = `#EXTM3U
#EXTINF:-1 tvg-id="cctv1" tvg-name="CCTV1" group-title="央视" tvg-logo="https://logo.test/cctv1.png",CCTV-1 综合
https://cdn.test/live/cctv1/index.m3u8
#EXTINF:-1 tvg-id="cctv5" tvg-name="CCTV5" group-title="体育" tvg-logo="https://logo.test/cctv5.png",CCTV-5 体育
https://cdn.test/live/cctv5/index.m3u8
#EXTINF:-1 tvg-id="hunan" tvg-name="Hunan" group-title="卫视" tvg-logo="https://logo.test/hunan.png",湖南卫视
https://cdn.test/live/hunan/index.m3u8
`;

function spawnAddon(playlistPath) {
  return spawnRustAddon('cineharbor-addon-live', {
    root: addonSdkRoot,
    env: {
      CINEHARBOR_ADDON_PORT: String(ADDON_PORT),
      CINEHARBOR_LIVE_SOURCE: playlistPath,
    },
  });
}

// 从 A 源页面里的 wasm worker 直连 B 源真实 live addon（跨源）。
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
    const version = await post(worker, "core_version", []);
    const manifest = JSON.parse(await post(worker, "manifest", [base]));
    const catalog = JSON.parse(await post(worker, "catalog", [base, "tv", "m3u8", null, null, null]));
    const meta = JSON.parse(await post(worker, "meta", [base, "tv", "live:m3u8:0"]));
    const streams = JSON.parse(await post(worker, "streams", [base, "tv", "live:m3u8:0"]));
    return {
      pageOrigin: location.origin,
      addonBase: base,
      version,
      manifestId: manifest.id,
      catalogCount: catalog.metas.length,
      firstChannel: catalog.metas[0].name,
      metaName: meta.meta.name,
      streamUrl: streams.streams[0] && streams.streams[0].url,
    };
  } finally {
    worker.terminate();
  }
})()`;

async function main() {
  const tmp = mkdtempSync(path.join(tmpdir(), 'ch-cross-origin-'));
  const playlistPath = path.join(tmp, 'channels.m3u');
  writeFileSync(playlistPath, PLAYLIST, 'utf8');

  const addon = spawnAddon(playlistPath);
  let server;
  let userDataDir;
  const chrome = { kill() {} };

  try {
    await waitForUrl(`${ADDON_BASE}/manifest.json`);
    const started = await spawnServer();
    server = started.child;
    userDataDir = mkdtempSync(path.join(tmpdir(), 'ch-smoke-'));
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
    assert.equal(result.manifestId, 'community.live');
    assert.equal(result.catalogCount, 3);
    assert.equal(result.firstChannel, 'CCTV-1 综合');
    assert.equal(result.metaName, result.firstChannel);
    const stream = new URL(result.streamUrl);
    assert.equal(stream.origin, ADDON_BASE);
    assert.equal(stream.pathname, '/media/live/m3u8');
    assert.equal(
      stream.searchParams.get('url'),
      'https://cdn.test/live/cctv1/index.m3u8'
    );
    console.log(
      `CROSS_ORIGIN_RESULT=${JSON.stringify(evaluation.result.value)}`
    );
    ws.close();
  } finally {
    chrome.kill();
    addon.kill('SIGKILL');
    server?.kill('SIGTERM');
    await sleep(150);
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`CROSS_ORIGIN_FAILED: ${error.message}`);
  process.exit(1);
});
