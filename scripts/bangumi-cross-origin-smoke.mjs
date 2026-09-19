import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  Cdp,
  launchChrome,
  readDevToolsPort,
  sleep,
  spawnRustAddon,
  spawnServer,
  waitForUrl,
  wsConnect,
} from './smoke-tools.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const addonSdkRoot = path.resolve(webRoot, '..', 'cineharbor-addon-sdk');
const ADDON_PORT = 11474;
const ADDON_BASE = 'http://127.0.0.1:' + ADDON_PORT;
const POSTER =
  'data:image/svg+xml;base64,' +
  Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="3"><rect width="2" height="3" fill="gray"/></svg>').toString('base64');

function calendarPayload() {
  return [
    {
      weekday: { en: 'Fri' },
      items: [
        {
          id: 40748,
          name: 'Sousou no Frieren',
          name_cn: '葬送的芙莉莲',
          summary: '魔法使芙莉莲的旅途',
          air_date: '2023-09-29',
          images: { large: POSTER },
          rating: { score: 9.0 },
        },
      ],
    },
  ];
}

function subjectPayload() {
  return {
    id: 40748,
    name: 'Sousou no Frieren',
    name_cn: '葬送的芙莉莲',
    summary: '魔法使芙莉莲的旅途',
    date: '2023-09-29',
    images: { large: POSTER },
  };
}

function startBangumiFixture() {
  return new Promise((resolve) => {
    const server = http.createServer((request, response) => {
      response.setHeader('access-control-allow-origin', '*');
      response.setHeader('content-type', 'application/json; charset=utf-8');
      if (request.url === '/calendar') {
        response.end(JSON.stringify(calendarPayload()));
        return;
      }
      if (request.url === '/v0/subjects/40748') {
        response.end(JSON.stringify(subjectPayload()));
        return;
      }
      response.statusCode = 404;
      response.end(JSON.stringify({ error: 'not found' }));
    });
    server.listen(0, '127.0.0.1', () =>
      resolve({ server, port: server.address().port })
    );
  });
}

function spawnBangumiAddon(baseUrl) {
  return spawnRustAddon('cineharbor-addon-bangumi', {
    root: addonSdkRoot,
    env: {
      CINEHARBOR_ADDON_PORT: String(ADDON_PORT),
      CINEHARBOR_BANGUMI_BASE_URL: baseUrl,
    },
  });
}

const EXPRESSION = '(async () => {' +
  'const base=' + JSON.stringify(ADDON_BASE) + ';' +
  'function post(worker,op,args){return new Promise((resolve,reject)=>{' +
  'const id=Math.floor(Math.random()*1e9);' +
  'const onMessage=(ev)=>{if(!ev.data||ev.data.id!==id)return;worker.removeEventListener("message",onMessage);ev.data.ok?resolve(ev.data.value):reject(new Error(ev.data.error));};' +
  'worker.addEventListener("message",onMessage);worker.postMessage({id,op,args});});}' +
  'const worker=new Worker("/core-worker.js",{type:"module"});' +
  'try{' +
  'const manifest=JSON.parse(await post(worker,"manifest",[base]));' +
  'const catalog=JSON.parse(await post(worker,"catalog",[base,"series","calendar",null,null,null]));' +
  'const first=catalog.metas[0];' +
  'const meta=first?JSON.parse(await post(worker,"meta",[base,"series",first.id])):null;' +
  'return {pageOrigin:location.origin,addonBase:base,manifestId:manifest.id,catalogCount:catalog.metas.length,firstId:first&&first.id,firstTitle:first&&first.name,weekday:first&&first.genres&&first.genres[0],rating:first&&first.rating,metaTitle:meta&&meta.meta.name};' +
  '}finally{worker.terminate();}' +
  '})()';

async function main() {
  const fixture = await startBangumiFixture();
  const addon = spawnBangumiAddon('http://127.0.0.1:' + fixture.port);
  let server;
  let userDataDir;
  let chrome;

  try {
    await waitForUrl(ADDON_BASE + '/manifest.json');
    const started = await spawnServer();
    server = started.child;
    userDataDir = mkdtempSync(path.join(tmpdir(), 'ch-bangumi-smoke-'));
    chrome = launchChrome(userDataDir);

    const debugPort = await readDevToolsPort(userDataDir);
    const targets = await (
      await fetch('http://127.0.0.1:' + debugPort + '/json', {
        signal: AbortSignal.timeout(5_000),
      })
    ).json();
    const page = targets.find((target) => target.type === 'page');
    assert.ok(page, 'Missing browser page target');

    const ws = await wsConnect(page.webSocketDebuggerUrl);
    const cdp = new Cdp(ws);
    await cdp.send('Runtime.enable');
    await cdp.send('Page.enable');
    const loaded = cdp.once('Page.loadEventFired');
    const navigationPromise = cdp.send('Page.navigate', {
      url: 'http://127.0.0.1:' + started.port + '/',
    });
    const results = await Promise.all([navigationPromise, loaded]);
    if (results[0].errorText) {
      throw new Error('Browser navigation failed: ' + results[0].errorText);
    }

    const evaluation = await cdp.send('Runtime.evaluate', {
      expression: EXPRESSION,
      awaitPromise: true,
      returnByValue: true,
    });
    if (evaluation.exceptionDetails) {
      throw new Error('evaluate failed: ' + JSON.stringify(evaluation.exceptionDetails));
    }
    const result = evaluation.result.value;
    assert.notEqual(result.pageOrigin, result.addonBase);
    assert.equal(result.manifestId, 'community.bangumi');
    assert.equal(result.catalogCount, 1);
    assert.equal(result.firstId, 'bangumi:40748');
    assert.equal(result.firstTitle, '葬送的芙莉莲');
    assert.equal(result.weekday, 'Fri');
    assert.equal(result.rating, '9');
    assert.equal(result.metaTitle, '葬送的芙莉莲');
    console.log('BANGUMI_CROSS_ORIGIN_RESULT=' + JSON.stringify(result));
    ws.close();
  } finally {
    chrome?.kill('SIGKILL');
    addon.kill('SIGKILL');
    server?.kill('SIGTERM');
    fixture.server.close();
    await sleep(150);
    if (userDataDir) rmSync(userDataDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error('BANGUMI_CROSS_ORIGIN_FAILED: ' + error.message);
  process.exit(1);
});
