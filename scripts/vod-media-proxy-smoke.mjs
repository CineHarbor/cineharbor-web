// Two complementary HTTP gates: real production binary rejects unsafe requests;
// real Rust router tests exercise positive HLS/byte forwarding through a test-only
// exact-socket fixture. Production must NEVER enable loopback egress to pass a smoke.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sleep, waitForUrl, spawnRustAddon } from './smoke-tools.mjs';

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sdkRoot = path.resolve(webRoot, '..', 'cineharbor-addon-sdk');
const port = 11480;
const base = `http://127.0.0.1:${port}`;
const requiredHttpTests = [
  'vod_m3u8_proxies_and_rewrites',
  'vod_proxy_requires_token_when_configured',
  'live_m3u8_uses_cineharbor_source_param',
  'redirected_manifests_use_the_final_document_for_vod_and_live',
  'authorized_multitrack_manifest_keeps_tokens_on_resource_uris',
  'upstream_failures_do_not_disclose_signed_urls',
  'every_route_rejects_missing_or_tampered_capabilities_before_egress',
  'redirect_cannot_reach_another_private_origin_and_loops_are_bounded',
  'ranges_head_and_cors_preserve_byte_semantics_without_forwarding_credentials',
  'oversized_unknown_length_streams_are_terminated_and_known_sizes_are_rejected',
  'rejects_oversized_keys_and_invalid_or_oversized_manifests',
  'manifest_head_never_advertises_the_unrewritten_length_or_fetches_a_body',
  'manifest_expansion_is_bounded_before_signing',
  'upstream_slot_lives_until_the_downstream_body_is_dropped',
];

async function main() {
  const routerTests = spawnSync(process.env.CARGO || 'cargo', [
    'test', '--locked', '-p', 'cineharbor-media', '--lib', 'serve::tests::', '--', '--test-threads=1',
  ], { cwd: sdkRoot, encoding: 'utf8', timeout: 15 * 60_000, maxBuffer: 8 * 1024 * 1024 });
  process.stdout.write(routerTests.stdout || '');
  process.stderr.write(routerTests.stderr || '');
  assert.equal(routerTests.status, 0, 'real media HTTP router tests must pass');
  for (const name of requiredHttpTests) {
    assert.ok(routerTests.stdout.includes(`test serve::tests::${name} ... ok`), `required HTTP case not executed: ${name}`);
  }

  const tmp = mkdtempSync(path.join(tmpdir(), 'ch-vod-media-'));
  let mediaRequests = 0;
  let addon;
  const upstream = http.createServer((request, response) => {
    if (new URL(request.url, 'http://fixture.test').pathname === '/api') {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ list: [{
        vod_id: '101', vod_name: 'Fixture', type_name: '电影',
        vod_play_url: `Film$http://127.0.0.1:${upstream.address().port}/index.m3u8`,
      }] }));
    } else {
      mediaRequests += 1;
      response.end('#EXTM3U\n#EXTINF:1,\nsegment.ts\n#EXT-X-ENDLIST');
    }
  });
  try {
    await new Promise((resolve, reject) => {
      upstream.once('error', reject);
      upstream.listen(0, '127.0.0.1', resolve);
    });
    const config = path.join(tmp, 'vod-sites.json');
    writeFileSync(config, JSON.stringify({ sites: [{
      key: 'mock', name: 'Fixture', api: `http://127.0.0.1:${upstream.address().port}/api`,
    }] }));
    addon = spawnRustAddon('cineharbor-addon-vod', { root: sdkRoot, env: {
      CINEHARBOR_ADDON_PORT: String(port),
      CINEHARBOR_VOD_SITES: config,
      CINEHARBOR_MEDIA_PROXY_TOKEN: 'fixture-only-signing-key-not-for-production-2026',
    } });
    await waitForUrl(`${base}/manifest.json`);
    const metadata = await fetch(`${base}/stream/movie/vod%3Amock%3A101.json`);
    assert.equal(metadata.status, 200);
    const payload = await metadata.json();
    const issued = new URL(payload.streams[0].url);
    assert.equal(issued.origin, base);
    assert.match(issued.searchParams.get('sig'), /^[A-Za-z0-9_-]{43}$/);
    assert.ok(Number(issued.searchParams.get('expires')) > Date.now() / 1000);
    assert.equal(issued.searchParams.has('token'), false);

    const unsigned = new URL(issued);
    unsigned.searchParams.delete('sig');
    const denied = await fetch(unsigned);
    assert.equal(denied.status, 401);
    const tampered = new URL(issued);
    tampered.searchParams.set('url', 'http://169.254.169.254/latest/meta-data');
    assert.equal((await fetch(tampered)).status, 401);
    const blocked = await fetch(issued);
    assert.equal(blocked.status, 403, 'even correctly signed private destinations must be rejected');
    const blockedBody = await blocked.text();
    assert.equal(blockedBody.includes(issued.searchParams.get('sig')), false);
    assert.equal(blockedBody.includes('127.0.0.1'), false);
    const head = await fetch(issued, { method: 'HEAD' });
    assert.equal(head.status, 403);
    assert.equal(await head.text(), '');
    const preflight = await fetch(issued, { method: 'OPTIONS', headers: {
      origin: 'https://web.test', 'access-control-request-method': 'GET',
      'access-control-request-headers': 'range',
    } });
    assert.ok(preflight.status >= 200 && preflight.status < 300);
    assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
    assert.equal(mediaRequests, 0, 'production binary must not contact the private media upstream');
    console.log(`VOD_MEDIA_PROXY_RESULT=${JSON.stringify({
      realRouterHttpCases: requiredHttpTests.length,
      productionIssuedCapability: true, unsignedStatus: denied.status,
      privateDestinationStatus: blocked.status, headStatus: head.status,
      privateUpstreamRequests: mediaRequests, signedUrlRedacted: true,
      scope: 'fixture HTTP forwarding plus real-binary denial; not production playback acceptance',
    })}`);
  } finally {
    addon?.kill('SIGKILL');
    upstream.closeAllConnections();
    upstream.close();
    await sleep(150);
    rmSync(tmp, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(`VOD_MEDIA_PROXY_FAILED: ${error.message}`); process.exitCode = 1; });
