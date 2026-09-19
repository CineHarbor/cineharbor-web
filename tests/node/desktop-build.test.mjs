import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildDesktopFrontend, shouldCopy } from '../../scripts/build-desktop-frontend.mjs';

function fixture(t) {
  const parent = mkdtempSync(path.join(os.tmpdir(), 'cineharbor-export-test-'));
  const root = path.join(parent, 'web');
  for (const dir of ['node_modules', 'scripts', 'public', 'src/app/api/example', 'src/app/media', 'desktop-shell-dist']) mkdirSync(path.join(root, dir), { recursive: true });
  for (const file of ['package.json', 'src/middleware.ts', 'src/app/api/example/route.ts', 'src/app/media/route.ts', 'public/manifest.json', 'desktop-shell-dist/index.html']) writeFileSync(path.join(root, file), 'original');
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  return { parent, root };
}

function assertSources(root) {
  for (const file of ['src/middleware.ts', 'src/app/api/example/route.ts', 'src/app/media/route.ts', 'public/manifest.json']) assert.equal(readFileSync(path.join(root, file), 'utf8'), 'original');
}

test('isolates APIs, source middleware, prior output and dependency trees', () => {
  for (const file of ['node_modules/x', '.git/config', '.next-build/a', '.desktop-build.lock', 'desktop-shell-dist/index.html', 'src/app/api/example/route.ts', 'src/app/media/route.ts', 'src/middleware.ts']) assert.equal(shouldCopy(file), false, file);
  assert.equal(shouldCopy('src/app/play/page.tsx'), true);
  assert.equal(shouldCopy('public/wasm/build-info.json'), true);
});

test('exports in isolation, installs generated output atomically and keeps live source', (t) => {
  const { parent, root } = fixture(t);
  let calls = 0;
  const output = buildDesktopFrontend({ projectRoot: root, env: {}, run(command, args, options) {
    calls++;
    assert.equal(command, process.execPath);
    assert.notEqual(options.cwd, root);
    assert.equal(existsSync(path.join(options.cwd, 'src/app/api')), false);
    assert.equal(options.env.CINEHARBOR_CORE_DIR, path.join(parent, 'cineharbor-core'));
    assert.equal(options.env.NEXT_PUBLIC_APP_TARGET, 'desktop');
    writeFileSync(path.join(options.cwd, 'public/manifest.json'), 'generated');
    if (args.at(-1) === 'build') {
      mkdirSync(path.join(options.cwd, '.next-desktop/_next'), { recursive: true });
      writeFileSync(path.join(options.cwd, '.next-desktop/index.html'), 'new export');
    }
  } });
  assert.equal(calls, 3);
  assert.equal(readFileSync(path.join(output, 'index.html'), 'utf8'), 'new export');
  assertSources(root);
  assert.deepEqual(readdirSync(parent), ['web']);
  assert.equal(existsSync(path.join(root, '.desktop-build.lock')), false);
});

test('command failure preserves source and previous output and cleans the workspace', (t) => {
  const { parent, root } = fixture(t);
  assert.throws(() => buildDesktopFrontend({ projectRoot: root, run() { throw new Error('build failed'); } }), /build failed/);
  assertSources(root);
  assert.equal(readFileSync(path.join(root, 'desktop-shell-dist/index.html'), 'utf8'), 'original');
  assert.deepEqual(readdirSync(parent), ['web']);
});

test('incomplete export never replaces the previous output', (t) => {
  const { root } = fixture(t);
  assert.throws(() => buildDesktopFrontend({ projectRoot: root, run() {} }), /Incomplete desktop/);
  assert.equal(readFileSync(path.join(root, 'desktop-shell-dist/index.html'), 'utf8'), 'original');
});

test('does not steal an existing build lock', (t) => {
  const { root } = fixture(t);
  mkdirSync(path.join(root, '.desktop-build.lock'));
  assert.throws(() => buildDesktopFrontend({ projectRoot: root, run() { assert.fail(); } }), /EEXIST/);
  assert.equal(existsSync(path.join(root, '.desktop-build.lock')), true);
  assertSources(root);
});

test('rejects symlinked output without touching its target', (t) => {
  const { parent, root } = fixture(t);
  rmSync(path.join(root, 'desktop-shell-dist'), { recursive: true });
  symlinkSync(parent, path.join(root, 'desktop-shell-dist'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => buildDesktopFrontend({ projectRoot: root, run() { assert.fail(); } }), /non-directory/);
  assertSources(root);
});
