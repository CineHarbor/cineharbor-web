import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const {
  buildRuntimeCaching,
} = require('../../src/lib/core/service-worker/runtime-caching.js');

test('all serialized Workbox callbacks execute without build-process closures', () => {
  for (const entry of buildRuntimeCaching()) {
    const callback = vm.runInNewContext(`(${entry.urlPattern.toString()})`);
    for (const path of [
      '/api/history',
      '/manifest.json',
      '/wasm/x.wasm',
      '/catalog/movie/a.json',
    ]) {
      const url = new URL('https://addon.test' + path);
      const args = {
        url,
        sameOrigin: false,
        request: { headers: new Headers(), credentials: 'same-origin' },
      };
      assert.equal(callback(args), entry.urlPattern(args));
    }
  }
});

test('activation removes known obsolete caches but preserves user downloads and precaches', async () => {
  let listener;
  let completion;
  const deleted = [];
  vm.runInNewContext(
    await readFile(new URL('../../worker/index.js', import.meta.url), 'utf8'),
    {
      self: {
        addEventListener: (event, callback) => {
          assert.equal(event, 'activate');
          listener = callback;
        },
      },
      caches: {
        keys: async () => [
          'apis',
          'core-wasm',
          'addon-meta',
          'static-video-assets',
          'start-url',
          'cineharbor-downloads',
          'workbox-precache-v2',
          'unrelated-app',
        ],
        delete: async (key) => {
          deleted.push(key);
          return true;
        },
      },
    }
  );
  listener({
    waitUntil: (promise) => {
      completion = promise;
    },
  });
  await completion;
  assert.deepEqual(deleted.sort(), [
    'addon-meta',
    'apis',
    'core-wasm',
    'start-url',
    'static-video-assets',
  ]);
});
