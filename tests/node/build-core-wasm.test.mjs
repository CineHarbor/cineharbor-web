import assert from 'node:assert/strict';
import path from 'node:path';
import test from 'node:test';
import {
  assertMatchingBindgen,
  lockedPackageVersion,
  resolveCoreDirectory,
} from '../../scripts/build-core-wasm.mjs';

const lock =
  'version = 4\n\n[[package]]\nname = "unrelated"\nversion = "9.0.0"\n\n[[package]]\nname = "wasm-bindgen"\nversion = "0.2.126"\nsource = "registry+example"\n';
test('finds the exact bridge version in a Cargo v4 lockfile', () => {
  assert.equal(lockedPackageVersion(lock, 'wasm-bindgen'), '0.2.126');
  assert.equal(
    lockedPackageVersion(lock.replaceAll('\n', '\r\n'), 'wasm-bindgen'),
    '0.2.126'
  );
});
test('missing, ambiguous and malformed bridge versions fail closed', () => {
  assert.throws(() => lockedPackageVersion(lock, 'missing'));
  assert.throws(() =>
    lockedPackageVersion(
      lock + '\n[[package]]\nname = "wasm-bindgen"\nversion = "0.2.100"\n',
      'wasm-bindgen'
    )
  );
  assert.throws(() =>
    lockedPackageVersion(
      lock.replace('0.2.126', 'not-a-version'),
      'wasm-bindgen'
    )
  );
});
test('CLI mismatch gives the exact locked installation command', () => {
  assertMatchingBindgen('wasm-bindgen 0.2.126\n', '0.2.126');
  assert.throws(
    () => assertMatchingBindgen('wasm-bindgen 0.2.100', '0.2.126'),
    /--version 0\.2\.126 --locked/
  );
});
test('Core overrides are anchored to the Web repository, not the caller directory', () => {
  const root = path.resolve('example/web');
  assert.equal(
    resolveCoreDirectory(undefined, root),
    path.resolve(root, '../cineharbor-core')
  );
  assert.equal(
    resolveCoreDirectory('../pinned-core', root),
    path.resolve(root, '../pinned-core')
  );
  const absolute = path.resolve('elsewhere/core');
  assert.equal(resolveCoreDirectory(absolute, root), absolute);
});
