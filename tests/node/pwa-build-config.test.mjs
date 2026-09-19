import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

// Capture the real options passed to next-pwa, rather than test a second policy.
const source = await readFile(new URL('../../next.config.js', import.meta.url), 'utf8');
function optionsFor(env = {}) {
  let captured;
  vm.runInNewContext(source, {
    module: { exports: {} }, process: { env },
    require(name) {
      if (name === 'next-pwa') return (options) => { captured = options; return (config) => config; };
      if (name.endsWith('/runtime-caching')) return { buildRuntimeCaching: () => [] };
      throw new Error(`Unexpected config dependency: ${name}`);
    },
  });
  return captured;
}

test('excludes only the unserved App Router build manifest, not public application assets', () => {
  const options = optionsFor({ NODE_ENV: 'production' });
  const excluded = (name) => options.buildExcludes.some((rule) => rule.test(name));
  assert.equal(excluded('app-build-manifest.json'), true);
  for (const name of ['manifest.json', 'wasm/build-info.json', 'wasm/cineharbor_core_web_bg.wasm', 'static/chunks/app-build-manifest.json.js', 'static/chunks/app/page.js']) {
    assert.equal(excluded(name), false, name);
  }
  assert.equal(options.register, false);
  assert.equal(options.skipWaiting, false);
  assert.equal(options.cacheStartUrl, false);
});

test('Desktop remains PWA-free and ordinary production keeps PWA enabled', () => {
  assert.equal(optionsFor({ NODE_ENV: 'production', NEXT_BUILD_TARGET: 'desktop' }).disable, true);
  assert.equal(optionsFor({ NODE_ENV: 'production' }).disable, false);
});

test('precache URLs escape actual Webpack filenames once without changing other resources', async () => {
  const options = optionsFor({ NODE_ENV: 'production' });
  const assets = new Set(['static/chunks/app/%5Foffline/page-abc.js', 'static/chunks/app/[slug]/page.js', 'static/chunks/main.js']);
  const entries = [
    { url: '/_next/static/chunks/app/%5Foffline/page-abc.js', revision: 'abc' },
    { url: '/_next/static/chunks/app/[slug]/page.js', revision: 'def' },
    { url: '/_next/static/chunks/main.js', revision: 'xyz' },
    { url: '/wasm/build-info.json', revision: '123' },
    { url: '/_offline', revision: '456' },
  ];
  const compilation = { getAsset: (name) => assets.has(name) ? {} : undefined };
  const transform = options.manifestTransforms[0];
  const first = await transform(entries, compilation);
  assert.equal(first.manifest[0].url, '/_next/static/chunks/app/%255Foffline/page-abc.js');
  assert.equal(first.manifest[1].url, '/_next/static/chunks/app/%5Bslug%5D/page.js');
  for (let i = 2; i < entries.length; i++) assert.equal(first.manifest[i].url, entries[i].url);
  assert.equal(first.manifest[0].revision, 'abc');
  const second = await transform(first.manifest, compilation);
  assert.equal(JSON.stringify(second), JSON.stringify(first));
});
