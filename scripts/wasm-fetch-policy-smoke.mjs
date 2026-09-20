// Execute the built Rust/WASM transport, using a fixture fetch to inspect RequestInit.
// This complements (and does not replace) the real-browser cross-origin gates.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import init, { addon_meta_json, addon_streams_json } from '../public/wasm/cineharbor_core_web.js';

const originalFetch = globalThis.fetch;
const requests = [];
const capability = `https://addon.test/prefix/media/vod/m3u8?source=fixture&url=https%3A%2F%2Fcdn.test%2Ffilm&expires=4102444800&sig=${'a'.repeat(43)}`;
try {
  await init({ module_or_path: readFileSync(new URL('../public/wasm/cineharbor_core_web_bg.wasm', import.meta.url)) });
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    const payload = new URL(url).pathname.includes('/meta/')
      ? { meta: { id: 'fixture', type: 'movie', name: 'Fixture', videos: [{ id: 'fixture', name: 'Film', streams: [{ url: capability }] }] } }
      : { streams: [{ url: capability }] };
    return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json' } });
  };
  await addon_meta_json('https://addon.test/prefix', 'movie', 'fixture');
  const first = JSON.parse(await addon_streams_json('https://addon.test/prefix', 'movie', 'fixture'));
  const renewed = JSON.parse(await addon_streams_json('https://addon.test/prefix', 'movie', 'fixture'));
  assert.equal(requests.length, 3, 'renewal must execute the transport again');
  for (const { options } of requests) {
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
  }
  assert.equal(first.streams[0].url, capability);
  assert.equal(renewed.streams[0].url, capability);
  console.log('WASM_FETCH_POLICY_RESULT={"requests":3,"noStore":true,"noAmbientCredentials":true,"noReferrer":true,"opaqueSignaturePreserved":true}');
} finally {
  globalThis.fetch = originalFetch;
}
