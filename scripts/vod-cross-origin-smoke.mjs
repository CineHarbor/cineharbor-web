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
// 端到端验证（vod 交叉源）：真实 headless Chrome 里从 A 源页面直连 B 源真实 vod addon :11473，
// 走 worker→wasm→fetch 管线，对 mock CustomAPI 站完成 catalog(search)/meta/streams，证明点播 cutover
// 的跨源直连链路成立（搜索→详情→剧集流）。与 live smoke 同构，仅换 addon 与 mock 数据源。
//
// 依赖：Chrome + node 22 + cargo（vod addon）。运行：node scripts/vod-cross-origin-smoke.mjs
// 成功 stdout 输出 `VOD_CROSS_ORIGIN_RESULT={...}`，失败非 0 退出。

import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const addonSdkRoot = path.resolve(webRoot, '..', 'cineharbor-addon-sdk');

const ADDON_PORT = 11473;
const ADDON_BASE = `http://127.0.0.1:${ADDON_PORT}`;

// mock CustomAPI 站的响应（ac=videolist：搜索带 wd / 详情带 ids）。剧集流用不可达的假 CDN——烟测只验
// 「stream url 被解析并透传」，不真正拉流。
function buildSearchPayload() {
  return {
    pagecount: 1,
    list: [
      {
        vod_id: '101',
        vod_name: '星际穿越',
        vod_pic: 'https://pic.test/101.jpg',
        vod_year: '2014',
        vod_class: '科幻',
        type_name: '电影',
        vod_content: '一部关于星际旅行的电影',
        vod_douban_id: '1889243',
        vod_play_url: '正片$http://cdn.test/movies/101.m3u8',
      },
      {
        vod_id: '202',
        vod_name: '星际迷航 新篇章',
        vod_pic: 'https://pic.test/202.jpg',
        vod_year: '2023',
        vod_class: '科幻/冒险',
        type_name: '连续剧',
        vod_content: '一部关于星际旅行的剧集',
        vod_douban_id: '36310054',
        vod_play_url:
          '第1集$http://cdn.test/series/202/ep1.m3u8#第2集$http://cdn.test/series/202/ep2.m3u8#第3集$http://cdn.test/series/202/ep3.m3u8',
      },
    ],
  };
}

function buildDetailPayload(vodId) {
  const item = buildSearchPayload().list.find((i) => i.vod_id === vodId);
  return { list: item ? [item] : [] };
}

async function startMockVodSite() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      const url = new URL(request.url, 'http://127.0.0.1');
      const ac = url.searchParams.get('ac');
      const wd = url.searchParams.get('wd');
      const ids = url.searchParams.get('ids');
      response.setHeader('content-type', 'application/json; charset=utf-8');
      if (ac === 'videolist' && ids) {
        response.end(JSON.stringify(buildDetailPayload(ids)));
      } else if (ac === 'videolist' && wd) {
        response.end(JSON.stringify(buildSearchPayload()));
      } else {
        response.end(JSON.stringify({ list: [], pagecount: 1 }));
      }
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, port: server.address().port });
    });
  });
}

function spawnVodAddon(configPath) {
  return spawnRustAddon('cineharbor-addon-vod', {
    root: addonSdkRoot,
    env: {
      CINEHARBOR_ADDON_PORT: String(ADDON_PORT),
      CINEHARBOR_VOD_SITES: configPath,
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
    const version = await post(worker, "core_version", []);
    const manifest = JSON.parse(await post(worker, "manifest", [base]));
    const catalog = JSON.parse(await post(worker, "catalog", [base, "movie", "search", "search", "星际", null]));
    const firstId = catalog.metas[0] && catalog.metas[0].id;
    const meta = firstId ? JSON.parse(await post(worker, "meta", [base, "movie", firstId])) : null;
    const streams = firstId ? JSON.parse(await post(worker, "streams", [base, "movie", firstId])) : null;
    return {
      pageOrigin: location.origin,
      addonBase: base,
      version,
      manifestId: manifest.id,
      catalogCount: catalog.metas.length,
      firstId,
      firstTitle: catalog.metas[0] && catalog.metas[0].name,
      metaName: meta && meta.meta.name,
      metaVideoCount: meta && meta.meta.videos.length,
      streamCount: streams && streams.streams.length,
      firstStreamUrl: streams && streams.streams[0] && streams.streams[0].url,
    };
  } finally {
    worker.terminate();
  }
})()`;

async function main() {
  const tmp = mkdtempSync(path.join(tmpdir(), 'ch-vod-cross-'));
  const mock = await startMockVodSite();
  const configPath = path.join(tmp, 'vod-sites.json');
  writeFileSync(
    configPath,
    JSON.stringify({
      sites: [
        {
          key: 'mock',
          name: 'MockSite',
          api: `http://127.0.0.1:${mock.port}/api`,
        },
      ],
    }),
    'utf8'
  );
  const addon = spawnVodAddon(configPath);
  let server;
  let userDataDir;
  const chrome = { kill() {} };

  try {
    await waitForUrl(`${ADDON_BASE}/manifest.json`);
    const started = await spawnServer();
    server = started.child;
    userDataDir = mkdtempSync(path.join(tmpdir(), 'ch-vod-smoke-'));
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
    assert.equal(result.manifestId, 'cineharbor.vod');
    assert.equal(result.catalogCount, 1);
    assert.equal(result.firstId, 'vod:mock:101');
    assert.equal(result.firstTitle, '星际穿越');
    assert.equal(result.metaName, result.firstTitle);
    assert.equal(result.metaVideoCount, 1);
    assert.equal(result.streamCount, 1);
    const stream = new URL(result.firstStreamUrl);
    assert.equal(stream.origin, ADDON_BASE);
    assert.equal(stream.pathname, '/media/vod/m3u8');
    assert.equal(stream.searchParams.get('source'), 'mock');
    assert.equal(
      stream.searchParams.get('url'),
      'http://cdn.test/movies/101.m3u8'
    );
    console.log(
      `VOD_CROSS_ORIGIN_RESULT=${JSON.stringify(evaluation.result.value)}`
    );
    ws.close();
  } finally {
    chrome.kill();
    addon.kill('SIGKILL');
    server?.kill('SIGTERM');
    mock.server.close();
    await sleep(150);
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`VOD_CROSS_ORIGIN_FAILED: ${error.message}`);
  process.exit(1);
});
