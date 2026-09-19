#!/usr/bin/env node
// Export in an isolated sibling checkout; never move or remove live Web source.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, renameSync, rmSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WEB_ROOT, resolveCoreDirectory } from './build-core-wasm.mjs';

const OMIT = new Set(['.git', '.agnir', '.github', 'node_modules', 'desktop-shell-dist', 'out', 'coverage', 'test-results']);

export function shouldCopy(relativePath) {
  const normalized = relativePath.split(path.sep).join('/');
  const first = normalized.split('/')[0];
  return !OMIT.has(first) && !first.startsWith('.next') &&
    !first.startsWith('.desktop') && !first.endsWith('.tsbuildinfo') &&
    !['src/app/api', 'src/app/media', 'src/middleware.ts'].some(
      (entry) => normalized === entry || normalized.startsWith(`${entry}/`)
    );
}

export function buildDesktopFrontend({ projectRoot = WEB_ROOT, env = process.env, run = execFileSync } = {}) {
  const root = realpathSync(projectRoot);
  const modules = path.join(root, 'node_modules');
  if (!existsSync(path.join(root, 'package.json')) || !existsSync(modules)) {
    throw new Error('A Web checkout with installed locked dependencies is required');
  }
  const output = path.join(root, 'desktop-shell-dist');
  if (existsSync(output) && (lstatSync(output).isSymbolicLink() || !lstatSync(output).isDirectory())) {
    throw new Error('Refusing to replace a non-directory desktop output');
  }
  const lock = path.join(root, '.desktop-build.lock');
  // An existing lock is not deleted: it may belong to another active exporter.
  mkdirSync(lock);
  let scratch;
  try {
    scratch = mkdtempSync(path.join(path.dirname(root), '.cineharbor-desktop-'));
    for (const entry of readdirSync(root)) {
      if (!shouldCopy(entry)) continue;
      cpSync(path.join(root, entry), path.join(scratch, entry), {
        recursive: true,
        filter: (source) => shouldCopy(path.relative(root, source)),
      });
    }
    symlinkSync(modules, path.join(scratch, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
    const desktopEnv = {
      ...env,
      CINEHARBOR_CORE_DIR: resolveCoreDirectory(env.CINEHARBOR_CORE_DIR, root),
      NEXT_BUILD_TARGET: 'desktop',
      NEXT_DIST_DIR: '.next-desktop',
      NEXT_PUBLIC_APP_TARGET: 'desktop',
      NEXT_PUBLIC_STORAGE_TYPE: env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
      NEXT_PUBLIC_API_BASE_URL: env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8787',
      NEXT_PUBLIC_MEDIA_PROXY_BASE_URL: env.NEXT_PUBLIC_MEDIA_PROXY_BASE_URL || 'http://127.0.0.1:8787',
      NEXT_PUBLIC_FLUID_SEARCH: env.NEXT_PUBLIC_FLUID_SEARCH || 'true',
      NEXT_PUBLIC_ENABLE_ADMIN_PANEL: env.NEXT_PUBLIC_ENABLE_ADMIN_PANEL || 'false',
    };
    const options = { cwd: scratch, env: desktopEnv, stdio: 'inherit', timeout: 30 * 60_000 };
    run(process.execPath, [path.join(scratch, 'scripts/build-core-wasm.mjs')], options);
    run(process.execPath, [path.join(scratch, 'scripts/generate-manifest.js')], options);
    // Execute the installed Node entry point directly, including on Windows.
    run(process.execPath, [path.join(modules, 'next/dist/bin/next'), 'build'], options);
    const exported = path.join(scratch, '.next-desktop');
    if (!existsSync(path.join(exported, 'index.html')) || !existsSync(path.join(exported, '_next'))) {
      throw new Error('Incomplete desktop static export; previous output has been preserved');
    }
    const backup = path.join(scratch, 'previous-output');
    if (existsSync(output)) renameSync(output, backup);
    try {
      renameSync(exported, output);
    } catch (error) {
      if (existsSync(backup)) renameSync(backup, output);
      throw error;
    }
    console.log(`Prepared desktop frontend dist at ${output}`);
    return output;
  } finally {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
    rmSync(lock, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    buildDesktopFrontend();
  } catch (error) {
    console.error(`DESKTOP_BUILD_FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
