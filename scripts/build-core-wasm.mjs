#!/usr/bin/env node
// Build the exact locked, release-mode Core WASM bridge before either client build.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = 'wasm32-unknown-unknown';
const CRATE = 'cineharbor-core-web';

export function lockedPackageVersion(lockText, name) {
  const versions = lockText.split(/^\[\[package\]\]\s*$/m).flatMap((entry) => {
    const packageName = entry.match(/^name\s*=\s*"([^"\r\n]+)"\s*$/m)?.[1];
    if (packageName !== name) return [];
    const version = entry.match(/^version\s*=\s*"([^"\r\n]+)"\s*$/m)?.[1];
    return version ? [version] : [];
  });
  if (versions.length !== 1 || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(versions[0])) {
    throw new Error(`Cargo.lock must contain exactly one valid ${name} version`);
  }
  return versions[0];
}

export function resolveCoreDirectory(value, webRoot = WEB_ROOT) {
  return path.resolve(webRoot, value || '../cineharbor-core');
}

export function assertMatchingBindgen(cliOutput, expected) {
  if (cliOutput.trim() !== `wasm-bindgen ${expected}`) {
    throw new Error(`wasm-bindgen CLI mismatch. Install: cargo install wasm-bindgen-cli --version ${expected} --locked`);
  }
}

export function buildCoreWasm({ webRoot = WEB_ROOT, env = process.env } = {}) {
  const coreDir = resolveCoreDirectory(env.CINEHARBOR_CORE_DIR, webRoot);
  const cargo = env.CARGO || 'cargo';
  const bindgen = env.WASM_BINDGEN || 'wasm-bindgen';
  const options = { cwd: coreDir, env, encoding: 'utf8', timeout: 15 * 60_000 };
  if (!existsSync(path.join(coreDir, 'Cargo.lock'))) throw new Error(`Missing locked Core checkout: ${coreDir}`);
  const expected = lockedPackageVersion(readFileSync(path.join(coreDir, 'Cargo.lock'), 'utf8'), 'wasm-bindgen');
  assertMatchingBindgen(execFileSync(bindgen, ['--version'], options), expected);
  const metadata = JSON.parse(execFileSync(cargo, ['metadata', '--no-deps', '--locked', '--format-version', '1'], options));
  const member = metadata.packages.find((item) => item.name === CRATE && metadata.workspace_members.includes(item.id));
  if (!member || !path.isAbsolute(metadata.target_directory)) throw new Error('Invalid Core workspace metadata');

  execFileSync(cargo, ['build', '--locked', '--release', '--package', CRATE, '--target', TARGET], { ...options, stdio: 'inherit' });
  // Cargo resolves CARGO_TARGET_DIR and its config itself; do not guess a developer cache path.
  const wasm = path.join(metadata.target_directory, TARGET, 'release', 'cineharbor_core_web.wasm');
  if (!existsSync(wasm)) throw new Error(`Cargo did not produce ${wasm}`);
  const publicRoot = path.join(webRoot, 'public');
  mkdirSync(publicRoot, { recursive: true });
  const output = path.join(publicRoot, 'wasm');
  if (existsSync(output) && (lstatSync(output).isSymbolicLink() || !lstatSync(output).isDirectory())) {
    throw new Error('Refusing to replace a non-directory WASM output');
  }
  const staging = mkdtempSync(path.join(publicRoot, '.wasm-build-'));
  const backup = `${staging}-previous`;
  try {
    execFileSync(bindgen, [wasm, '--target', 'web', '--out-dir', staging], { ...options, stdio: 'inherit' });
    const binary = path.join(staging, 'cineharbor_core_web_bg.wasm');
    if (!existsSync(binary) || !existsSync(path.join(staging, 'cineharbor_core_web.js'))) {
      throw new Error('Incomplete WASM bridge output');
    }
    const info = {
      crate: CRATE,
      version: member.version,
      target: TARGET,
      profile: 'release',
      wasm_bindgen: expected,
      sha256: createHash('sha256').update(readFileSync(binary)).digest('hex'),
    };
    writeFileSync(path.join(staging, 'build-info.json'), `${JSON.stringify(info, null, 2)}\n`);
    if (existsSync(output)) renameSync(output, backup);
    try {
      renameSync(staging, output);
    } catch (error) {
      if (existsSync(backup)) renameSync(backup, output);
      throw error;
    }
    rmSync(backup, { recursive: true, force: true });
    console.log(`WASM_BUILD=${JSON.stringify(info)}`);
    return info;
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.includes('--print-bindgen-version')) {
      const coreDir = resolveCoreDirectory(process.env.CINEHARBOR_CORE_DIR);
      console.log(lockedPackageVersion(readFileSync(path.join(coreDir, 'Cargo.lock'), 'utf8'), 'wasm-bindgen'));
    } else {
      buildCoreWasm();
    }
  } catch (error) {
    console.error(`WASM_BUILD_FAILED: ${error.message}`);
    process.exitCode = 1;
  }
}
