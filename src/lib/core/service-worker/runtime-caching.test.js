const { buildRuntimeCaching } = jest.requireActual('./runtime-caching');
const APP_ORIGIN = 'https://app.test';

function handler(urlString, overrides = {}) {
  const url = new URL(urlString);
  const args = {
    url,
    sameOrigin: url.origin === APP_ORIGIN,
    request: {
      credentials: 'same-origin',
      headers: { has: () => false },
      ...overrides,
    },
  };
  return buildRuntimeCaching().find((entry) => entry.urlPattern(args));
}

describe('PWA first-match security policy', () => {
  it.each([
    '/api/login',
    '/api/logout',
    '/api/favorites',
    '/api/history',
    '/api/admin/config',
    '/api/desktop/latest.json',
    '/api/profile-sync',
    '/api/proxy/vod/m3u8?url=x',
    '/media/live/m3u8',
    '/video.ts',
    '/video.mp4',
    '/key.key',
    '/meta/movie/123.json',
    '/prefix/media/vod/m3u8',
    '/prefix/stream/tv/channel.json',
  ])('never caches private or media path %s', (path) => {
    expect(handler(APP_ORIGIN + path).handler).toBe('NetworkOnly');
  });
  it.each([
    '/manifest.json',
    '/catalog/movie/search.json',
    '/catalog/movie/search/search=test.json',
  ])('caches only anonymous remote protocol metadata: %s', (path) => {
    expect(handler('https://addon.test' + path).handler).toBe(
      'StaleWhileRevalidate'
    );
    expect(handler(APP_ORIGIN + path).handler).toBe('NetworkOnly');
  });
  it.each([
    'token',
    'access_token',
    'api_key',
    'signature',
    'sig',
    'expires',
    'AUTH',
    'password',
  ])('tokenized metadata never reaches a cache (%s)', (key) => {
    expect(
      handler(`https://addon.test/manifest.json?${key}=private`).handler
    ).toBe('NetworkOnly');
  });
  it('never caches remote metadata containing expiring stream URLs', () => {
    expect(handler('https://addon.test/meta/movie/123.json').handler).toBe('NetworkOnly');
  });
  it('credentials, private addon prefixes and streams are network-only', () => {
    expect(
      handler('https://addon.test/manifest.json', { credentials: 'include' })
        .handler
    ).toBe('NetworkOnly');
    expect(
      handler('https://addon.test/manifest.json', {
        headers: { has: (name) => name === 'authorization' },
      }).handler
    ).toBe('NetworkOnly');
    expect(
      handler('https://addon.test/manifest.json', {
        headers: { has: (name) => name === 'range' },
      }).handler
    ).toBe('NetworkOnly');
    expect(handler('https://user:pass@addon.test/manifest.json').handler).toBe(
      'NetworkOnly'
    );
    expect(handler('https://addon.test/private/manifest.json').handler).toBe(
      'NetworkOnly'
    );
    expect(handler('https://addon.test/stream/movie/a.json').handler).toBe(
      'NetworkOnly'
    );
  });
  it('has no permanent runtime WASM cache or broad account/page/cross-origin cache', () => {
    const names = buildRuntimeCaching()
      .map((entry) => entry.options?.cacheName)
      .filter(Boolean);
    expect(names).toEqual(['cineharbor-public-addon-catalog-v2']);
    expect(
      handler(APP_ORIGIN + '/wasm/cineharbor_core_web_bg.wasm').handler
    ).toBe('NetworkOnly');
    expect(handler(APP_ORIGIN + '/profile').handler).toBe('NetworkOnly');
  });
});
