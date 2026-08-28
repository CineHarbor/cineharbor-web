#!/usr/bin/env node
// 桌面目标（NEXT_BUILD_TARGET=desktop）静态导出，产出 desktop-shell-dist，
// 供 cineharbor-desktop 的 Tauri 壳作 frontendDist 使用。
// 静态导出无法物化动态 API/媒体路由，故构建期暂移出。

import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const outputDir = join(projectRoot, 'desktop-shell-dist');
const desktopDistDir = join(projectRoot, '.next-desktop');
const tempDir = join(projectRoot, '.desktop-build-temp');

const desktopEnv = {
  ...process.env,
  NEXT_BUILD_TARGET: 'desktop',
  NEXT_PUBLIC_APP_TARGET: process.env.NEXT_PUBLIC_APP_TARGET || 'desktop',
  NEXT_PUBLIC_STORAGE_TYPE:
    process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
  NEXT_PUBLIC_API_BASE_URL:
    process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8787',
  NEXT_PUBLIC_MEDIA_PROXY_BASE_URL:
    process.env.NEXT_PUBLIC_MEDIA_PROXY_BASE_URL || 'http://127.0.0.1:8787',
  NEXT_PUBLIC_FLUID_SEARCH: process.env.NEXT_PUBLIC_FLUID_SEARCH || 'true',
  NEXT_PUBLIC_ENABLE_ADMIN_PANEL:
    process.env.NEXT_PUBLIC_ENABLE_ADMIN_PANEL || 'false',
};

const temporarilyMovedPaths = [];
// pnpm ships as a .cmd shim on Windows; execFileSync() (no shell) only resolves
// real executables, so address the shim explicitly there.
const pnpmBin = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function moveAside(relativePath, tempName) {
  const sourcePath = join(projectRoot, relativePath);
  if (!existsSync(sourcePath)) return;
  const targetPath = join(tempDir, tempName);
  mkdirSync(dirname(targetPath), { recursive: true });
  rmSync(targetPath, { force: true, recursive: true });
  renameSync(sourcePath, targetPath);
  temporarilyMovedPaths.push({ sourcePath, targetPath });
}

function restoreAll() {
  for (const entry of temporarilyMovedPaths.reverse()) {
    if (!existsSync(entry.targetPath)) continue;
    rmSync(entry.sourcePath, { force: true, recursive: true });
    mkdirSync(dirname(entry.sourcePath), { recursive: true });
    renameSync(entry.targetPath, entry.sourcePath);
  }
  rmSync(tempDir, { force: true, recursive: true });
}

try {
  moveAside('src/app/api', 'src-app-api');
  moveAside('src/app/media', 'src-app-media');
  moveAside('src/middleware.ts', 'src-middleware.ts');
  moveAside('.next-build', 'next-build');

  rmSync(desktopDistDir, { force: true, recursive: true });
  rmSync(outputDir, { force: true, recursive: true });

  execFileSync(pnpmBin, ['gen:manifest'], {
    cwd: projectRoot,
    env: desktopEnv,
    stdio: 'inherit',
  });
  execFileSync(pnpmBin, ['exec', 'next', 'build'], {
    cwd: projectRoot,
    env: desktopEnv,
    stdio: 'inherit',
  });

  if (!existsSync(join(desktopDistDir, 'index.html'))) {
    throw new Error(`Missing exported desktop frontend at ${desktopDistDir}`);
  }

  mkdirSync(outputDir, { recursive: true });
  cpSync(desktopDistDir, outputDir, { recursive: true });

  console.log(`Prepared desktop frontend dist at ${outputDir}`);
} finally {
  restoreAll();
}