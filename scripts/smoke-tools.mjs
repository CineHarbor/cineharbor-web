// Shared, bounded real-browser/addon test tooling. No developer-specific caches.
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function findChrome(env = process.env) {
  const lookup = (candidate) => {
    if (path.isAbsolute(candidate) || candidate.includes(path.sep))
      return existsSync(candidate) ? candidate : null;
    for (const directory of (env.PATH || '').split(path.delimiter)) {
      for (const suffix of process.platform === 'win32' ? ['', '.exe'] : ['']) {
        const executable = path.join(directory, candidate + suffix);
        if (existsSync(executable)) return executable;
      }
    }
    return null;
  };
  if (env.CHROME_PATH) {
    const explicit = lookup(env.CHROME_PATH);
    if (!explicit)
      throw new Error(`CHROME_PATH does not exist: ${env.CHROME_PATH}`);
    return explicit;
  }
  const candidates = [
    'google-chrome',
    'google-chrome-stable',
    'chromium',
    'chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ...[env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA]
      .filter(Boolean)
      .map((root) =>
        path.join(root, 'Google', 'Chrome', 'Application', 'chrome.exe')
      ),
  ];
  for (const candidate of candidates) {
    const executable = lookup(candidate);
    if (executable) return executable;
  }
  throw new Error(
    'Chrome/Chromium is required. Set CHROME_PATH to its executable.'
  );
}

export function launchChrome(userDataDir) {
  const child = spawn(
    findChrome(),
    [
      '--headless=new',
      '--no-sandbox',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-dev-shm-usage',
      '--remote-debugging-port=0',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );
  child.on('error', (error) => {
    child.startupError = error;
  });
  return child;
}

export async function readDevToolsPort(userDataDir) {
  const deadline = Date.now() + 10_000;
  const file = path.join(userDataDir, 'DevToolsActivePort');
  while (Date.now() < deadline) {
    if (existsSync(file)) {
      const port = Number(readFileSync(file, 'utf8').split('\n')[0]);
      if (Number.isInteger(port) && port > 0 && port < 65536) return port;
    }
    await sleep(50);
  }
  throw new Error('Chrome did not expose a DevTools port within 10 seconds');
}

export async function waitForUrl(url, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let last = 'no response';
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(
          Math.min(2000, Math.max(1, deadline - Date.now()))
        ),
      });
      await response.body?.cancel();
      if (response.ok) return;
      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error.message;
    }
    await sleep(100);
  }
  throw new Error(`Startup deadline exceeded for ${url}: ${last}`);
}

export function spawnServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(WEB_ROOT, 'scripts', 'wasm-smoke.mjs')],
      {
        cwd: WEB_ROOT,
        stdio: ['ignore', 'pipe', 'inherit'],
      }
    );
    let settled = false;
    let buffer = '';
    const finish = (error, port) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        child.kill('SIGKILL');
        reject(error);
      } else resolve({ child, port });
    };
    const timer = setTimeout(
      () => finish(new Error('Smoke server startup timed out')),
      10_000
    );
    child.on('error', (error) => finish(error));
    child.on('exit', (code, signal) =>
      finish(
        new Error(`Smoke server exited before readiness: ${code ?? signal}`)
      )
    );
    child.stdout.on('data', (chunk) => {
      buffer = (buffer + String(chunk)).slice(-64_000);
      const match = buffer.match(/SMOKE_PORT=(\d+)/);
      if (match) finish(null, Number(match[1]));
    });
  });
}

export function spawnRustAddon(name, { root, env = {} }) {
  if (!/^cineharbor-addon-(live|vod|douban|bangumi)$/.test(name))
    throw new Error('Unexpected addon test target');
  const cargo = process.env.CARGO || 'cargo';
  const options = {
    cwd: root,
    env: { ...process.env, ...env },
    timeout: 15 * 60_000,
  };
  execFileSync(cargo, ['build', '--locked', '--package', name], {
    ...options,
    stdio: 'inherit',
  });
  const metadata = JSON.parse(
    execFileSync(
      cargo,
      ['metadata', '--no-deps', '--locked', '--format-version', '1'],
      { ...options, encoding: 'utf8' }
    )
  );
  const executable = path.join(
    metadata.target_directory,
    'debug',
    `${name}${process.platform === 'win32' ? '.exe' : ''}`
  );
  if (!existsSync(executable))
    throw new Error(`Missing built addon: ${executable}`);
  const child = spawn(executable, [], {
    ...options,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  child.on('error', (error) => {
    child.startupError = error;
  });
  return child;
}

export class Cdp {
  constructor(ws, timeoutMs = 30_000) {
    this.ws = ws;
    this.timeoutMs = timeoutMs;
    this.id = 0;
    this.pending = new Map();
    this.listeners = new Map();
    ws.addEventListener('message', (event) => this.onMessage(event.data));
    ws.addEventListener('close', () =>
      this.failPending(new Error('DevTools connection closed'))
    );
    ws.addEventListener('error', () =>
      this.failPending(new Error('DevTools connection failed'))
    );
  }
  failPending(error) {
    for (const entry of this.pending.values()) {
      clearTimeout(entry.timer);
      entry.reject(error);
    }
    this.pending.clear();
    for (const handlers of this.listeners.values())
      for (const entry of handlers) {
        clearTimeout(entry.timer);
        entry.reject(error);
      }
    this.listeners.clear();
  }
  onMessage(raw) {
    let message;
    try {
      message = JSON.parse(String(raw));
    } catch {
      this.failPending(new Error('Malformed DevTools response'));
      return;
    }
    if (message.id !== undefined) {
      const entry = this.pending.get(message.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      this.pending.delete(message.id);
      if (message.error) entry.reject(new Error(message.error.message));
      else entry.resolve(message.result);
    } else if (message.method) {
      const handlers = this.listeners.get(message.method) || [];
      this.listeners.delete(message.method);
      for (const entry of handlers) {
        clearTimeout(entry.timer);
        entry.resolve(message.params);
      }
    }
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`DevTools command timed out: ${method}`));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (error) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error);
      }
    });
  }
  once(method) {
    return new Promise((resolve, reject) => {
      const entry = { resolve, reject };
      entry.timer = setTimeout(() => {
        const remaining = (this.listeners.get(method) || []).filter(
          (candidate) => candidate !== entry
        );
        if (remaining.length) this.listeners.set(method, remaining);
        else this.listeners.delete(method);
        reject(new Error(`DevTools event timed out: ${method}`));
      }, this.timeoutMs);
      this.listeners.set(method, [
        ...(this.listeners.get(method) || []),
        entry,
      ]);
    });
  }
}

export function wsConnect(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      ws.close();
      reject(new Error('DevTools connection timed out'));
    }, 10_000);
    ws.addEventListener(
      'open',
      () => {
        clearTimeout(timer);
        resolve(ws);
      },
      { once: true }
    );
    ws.addEventListener(
      'error',
      () => {
        clearTimeout(timer);
        reject(new Error('DevTools connection failed'));
      },
      { once: true }
    );
  });
}
