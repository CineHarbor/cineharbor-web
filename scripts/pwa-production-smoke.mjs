import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Cdp, launchChrome, readDevToolsPort, waitForUrl, wsConnect } from './smoke-tools.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const swPath = path.join(root, 'public/sw.js');
const infoPath = path.join(root, 'public/wasm/build-info.json');
const profile = await mkdtemp(path.join(os.tmpdir(), 'cineharbor-pwa-'));
const originalSw = await readFile(swPath, 'utf8');
const originalInfo = await readFile(infoPath, 'utf8');
const port = await new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const value = server.address().port;
    server.close(() => resolve(value));
  });
});
const server = spawn(process.execPath, [
  'node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port),
], {
  cwd: root,
  stdio: ['ignore', 'inherit', 'inherit'],
  env: {
    ...process.env, NODE_ENV: 'production', PASSWORD: randomUUID(),
    CINEHARBOR_ALLOWED_HOSTS: '127.0.0.1', NEXT_PUBLIC_STORAGE_TYPE: 'localstorage',
  },
});
let chrome;
let ws;
let browserCdp;
const origin = `http://127.0.0.1:${port}`;
try {
  await waitForUrl(`${origin}/login`, 30_000);
  // Verify every precached deployment asset and imported SW script without a cookie.
  // Redirect-to-login can return HTML with 200 while making SW installation fail.
  const importedScripts = [...originalSw.matchAll(/importScripts\(("[^"]+"(?:,"[^"]+")*)\)/g)]
    .flatMap((match) => JSON.parse(`[${match[1]}]`));
  const workerModules = [...originalSw.matchAll(/define\(\[([^\]]+)\]/g)]
    .flatMap((match) => JSON.parse(`[${match[1]}]`))
    .filter((module) => module.startsWith('./workbox-'))
    .map((module) => `${module}.js`);
  const precached = [...originalSw.matchAll(/\{url:"([^"]+)",revision:/g)]
    .map((match) => match[1]);
  for (const asset of new Set(['/sw.js', ...importedScripts, ...workerModules, ...precached])) {
    const url = new URL(asset, `${origin}/`);
    assert.equal(url.origin, origin, 'Precache must contain only deployment-owned assets');
    assert.equal(url.pathname.startsWith('/api/'), false, 'Private API cannot be precached');
    const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(10000) });
    assert.equal(response.status, 200, `Public PWA asset is not available before login: ${url.pathname}`);
    if (url.pathname.endsWith('.js'))
      assert.match(response.headers.get('content-type') || '', /javascript/, `Non-script response: ${url.pathname}`);
    await response.body?.cancel();
  }
  chrome = launchChrome(profile);
  const debugPort = await readDevToolsPort(profile);
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`, {
    signal: AbortSignal.timeout(5000),
  })).json();
  const page = targets.find((target) => target.type === 'page');
  assert.ok(page, 'Missing browser page target');
  ws = await wsConnect(page.webSocketDebuggerUrl);
  const cdp = new Cdp(ws, 120_000);
  browserCdp = cdp;
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  const evaluate = async (expression) => {
    const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const navigate = async (url) => {
    const loaded = cdp.once('Page.loadEventFired');
    const [result] = await Promise.all([cdp.send('Page.navigate', { url }), loaded]);
    assert.equal(result.errorText, undefined, 'Browser navigation failed');
  };
  // Establish origin without loading React registration, then seed an obsolete cache.
  await navigate(`${origin}/robots.txt`);
  await evaluate(`(async () => {
    const old = await caches.open('apis');
    await old.put('/api/history', new Response('private-old-account-data'));
    localStorage.setItem('cineharbor-pwa-release-smoke', 'preserved');
    return true;
  })()`);
  await navigate(`${origin}/login`);
  const initial = await evaluate(`(async () => {
    const wait = async (test) => { const end = Date.now() + 60000; while (!(await test())) { if (Date.now() > end) throw new Error('PWA readiness timeout'); await new Promise(r => setTimeout(r, 100)); } };
    await wait(() => navigator.serviceWorker.controller);
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!registration?.active) throw new Error('Application did not register its PWA worker');
    const legacy = (await caches.keys()).includes('apis');
    const denied = await fetch('/api/history');
    const keys = (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(r => r.url)))).flat();
    const privateCached = keys.some(url => new URL(url).pathname.startsWith('/api/'));
    const info = await (await fetch('/wasm/build-info.json')).json();
    const worker = new Worker('/core-worker.js', {type: 'module'});
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Storage worker timeout')), 10000);
      worker.onmessage = ({data}) => { clearTimeout(timer); data.ok ? resolve(data.value) : reject(new Error(data.error)); };
      worker.onerror = () => { clearTimeout(timer); reject(new Error('Storage worker crashed')); };
      worker.postMessage({ id: 1, op: 'storage_set', args: ['pwa-update-smoke', 'stored-before-update'] });
    });
    worker.terminate();
    return { legacy, privateCached, deniedStatus: denied.status, info, hasWasm: keys.some(url => url.includes('cineharbor_core_web_bg.wasm')) };
  })()`);
  assert.equal(initial.info.sha256, JSON.parse(originalInfo).sha256, 'PWA served stale WASM metadata');
  assert.equal(initial.legacy, false, 'Obsolete account cache was not removed');
  assert.equal(initial.privateCached, false, 'Private API response entered cache');
  assert.equal(initial.deniedStatus, 401, 'Unauthenticated API did not fail closed');
  assert.equal(initial.hasWasm, true, 'WASM was not revision-precached');

  // Real installed Service Worker update. Not a substitute for signed Desktop updater acceptance.
  const marker = randomUUID();
  const changedInfo = JSON.stringify({ ...JSON.parse(originalInfo), pwaUpdateSmoke: marker });
  const revision = createHash('md5').update(changedInfo).digest('hex');
  const pattern = /\{url:"\/wasm\/build-info\.json",revision:"[a-f0-9]+"\}/g;
  assert.equal((originalSw.match(pattern) || []).length, 1, 'Expected one revisioned WASM metadata entry');
  const nextSw = originalSw.replace(pattern, `{url:"/wasm/build-info.json",revision:"${revision}"}`) + `\n/* PWA acceptance ${marker} */\n`;
  await writeFile(infoPath, changedInfo);
  await writeFile(swPath, nextSw);
  const waiting = await evaluate(`(async () => {
    const registration = await navigator.serviceWorker.getRegistration('/');
    await registration.update();
    const deadline = Date.now() + 60000;
    while (!registration.waiting || !Array.from(document.querySelectorAll('button')).some(b => b.textContent.includes('更新并重新载入'))) {
      if (Date.now() > deadline) throw new Error('PWA update prompt was not shown');
      await new Promise(r => setTimeout(r, 100));
    }
    return Boolean(registration.waiting);
  })()`);
  assert.equal(waiting, true);
  const reloaded = cdp.once('Page.loadEventFired');
  await evaluate(`(() => { const button = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('更新并重新载入')); if (!button) throw new Error('Missing update action'); button.click(); return true; })()`);
  await reloaded;
  const updated = await evaluate(`(async () => {
    const info = await (await fetch('/wasm/build-info.json')).json();
    const worker = new Worker('/core-worker.js', {type: 'module'});
    const stored = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Storage read timeout')), 10000);
      worker.onmessage = ({data}) => { clearTimeout(timer); data.ok ? resolve(data.value) : reject(new Error(data.error)); };
      worker.onerror = () => { clearTimeout(timer); reject(new Error('Storage worker crashed')); };
      worker.postMessage({id: 1, op: 'storage_get', args: ['pwa-update-smoke']});
    });
    worker.terminate();
    const cacheUrls = (await Promise.all((await caches.keys()).map(async key => (await (await caches.open(key)).keys()).map(r => r.url)))).flat();
    return { info, stored, local: localStorage.getItem('cineharbor-pwa-release-smoke'), cacheUrls };
  })()`);
  assert.equal(updated.info.pwaUpdateSmoke, marker, 'New precache revision was not activated');
  assert.equal(updated.stored, 'stored-before-update', 'IndexedDB was lost during PWA upgrade');
  assert.equal(updated.local, 'preserved', 'User settings were lost during PWA upgrade');
  const infoUrls = updated.cacheUrls.filter((url) => new URL(url).pathname === '/wasm/build-info.json');
  assert.equal(infoUrls.length, 1, 'Stale metadata revision remains cached');
  assert.equal(new URL(infoUrls[0]).searchParams.get('__WB_REVISION__'), revision);
  console.log('PWA_PRODUCTION_RESULT=' + JSON.stringify({
    registration: true, accountCacheIsolation: true, wasmPrecache: true,
    oldCacheRemoval: true, realWaitingUpdate: true, staleRevisionRemoved: true,
    indexedDbPreserved: true, localSettingsPreserved: true,
  }));
} catch (error) {
  if (browserCdp) {
    try {
      const diagnostic = await browserCdp.send('Runtime.evaluate', {
        expression: `(async () => ({path: location.pathname, controlled: Boolean(navigator.serviceWorker.controller), status: document.querySelector('[role="status"]')?.textContent, registrations: (await navigator.serviceWorker.getRegistrations()).map(r => ({scope: r.scope, installing: r.installing?.state, waiting: r.waiting?.state, active: r.active?.state}))}))()`,
        awaitPromise: true, returnByValue: true,
      });
      console.error('PWA_DIAGNOSTIC=' + JSON.stringify(diagnostic.result?.value));
    } catch (diagnosticError) {
      console.error('PWA diagnostic unavailable: ' + diagnosticError.message);
    }
  }
  throw error;
} finally {
  await writeFile(swPath, originalSw);
  await writeFile(infoPath, originalInfo);
  ws?.close();
  chrome?.kill('SIGKILL');
  server.kill('SIGKILL');
  await new Promise((resolve) => setTimeout(resolve, 250));
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
}
