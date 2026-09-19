// Execute all required runtime gates. Never let shell errexit hide later failures.
import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const requiredSmokes = [
  'wasm-cdp-smoke',
  'addon-cross-origin-smoke',
  'vod-cross-origin-smoke',
  'douban-cross-origin-smoke',
  'vod-media-proxy-smoke',
  'pwa-production-smoke',
];

export function runSuite({
  cases,
  cwd = process.cwd(),
  outputDir = path.join(cwd, 'test-results'),
  timeoutMs = 15 * 60_000,
  report = (text) => process.stdout.write(text),
}) {
  if (!Array.isArray(cases) || cases.length === 0)
    throw new Error('At least one runtime gate is required');
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)
    throw new Error('A positive finite timeout is required');
  const names = new Set();
  for (const entry of cases) {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(entry.name) || names.has(entry.name))
      throw new Error('Gate names must be unique safe identifiers');
    names.add(entry.name);
    if (!Array.isArray(entry.args) || entry.args.some((arg) => typeof arg !== 'string'))
      throw new Error('Gate arguments must be strings');
  }
  mkdirSync(outputDir, { recursive: true });
  const results = [];
  for (const { name, args } of cases) {
    report(`::group::${name}\n`);
    const logPath = path.join(outputDir, `${name}.log`);
    const fd = openSync(logPath, 'w');
    let result;
    const startedAt = new Date().toISOString();
    try {
      result = spawnSync(process.execPath, args, {
        cwd,
        env: process.env,
        timeout: timeoutMs,
        killSignal: 'SIGKILL',
        stdio: ['ignore', fd, fd],
      });
    } finally {
      closeSync(fd);
    }
    const exitCode = result.status ?? 1;
    const record = {
      name,
      startedAt,
      finishedAt: new Date().toISOString(),
      exitCode,
      signal: result.signal ?? null,
      error: result.error?.code ?? null,
      passed: exitCode === 0 && !result.signal && !result.error,
    };
    writeFileSync(path.join(outputDir, `${name}.exit`), `${exitCode}\n`);
    results.push(record);
    // The complete file remains an artifact; bound console output independently.
    const log = readFileSync(logPath);
    report(log.subarray(Math.max(0, log.length - 256_000)).toString('utf8'));
    report(`\n${name}: ${record.passed ? 'PASS' : 'FAIL'} (exit ${exitCode}${record.error ? `, ${record.error}` : ''})\n::endgroup::\n`);
  }
  const passed = results.every((record) => record.passed);
  writeFileSync(path.join(outputDir, 'summary.json'), `${JSON.stringify({ passed, results }, null, 2)}\n`);
  return { passed, results };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { passed } = runSuite({
    cases: requiredSmokes.map((name) => ({ name, args: [`scripts/${name}.mjs`] })),
  });
  process.exitCode = passed ? 0 : 1;
}
