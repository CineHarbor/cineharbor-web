// Workbox serializes these functions into sw.js: every callback must be self-contained.
// Revisioned application/worker/WASM assets are precached as one build, not held in
// a separate year-long CacheFirst store. Runtime caching is public metadata only.
function buildRuntimeCaching() {
  return [
    {
      // First-match policy: credentials, API data and media can never fall through to a cache.
      urlPattern: ({ url, request }) =>
        /^\/(?:api|media|download|downloads)(?:\/|$)/i.test(url.pathname) ||
        /\.(?:m3u8|ts|m4s|mp4|mp3|aac|key)(?:$|\/)/i.test(url.pathname) ||
        request.headers.has('authorization') ||
        request.headers.has('range') ||
        request.credentials === 'include' ||
        Boolean(url.username || url.password) ||
        Array.from(url.searchParams.keys()).some((key) =>
          /token|secret|auth|key|signature|credential|password/i.test(key)
        ),
      handler: 'NetworkOnly',
      options: {},
    },
    {
      // Only root protocol metadata on an anonymous remote addon is cacheable.
      // No configured/private path prefix, same-origin account data or stream URL is cached.
      urlPattern: ({ url, request, sameOrigin }) =>
        !sameOrigin &&
        request.credentials !== 'include' &&
        !request.headers.has('authorization') &&
        !url.username &&
        !url.password &&
        (url.pathname === '/manifest.json' ||
          /^\/(?:catalog|meta)\/[^/]+\/[^/]+(?:\/[^/]+)?\.json$/.test(
            url.pathname
          )),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'cineharbor-public-addon-meta-v1',
        cacheableResponse: { statuses: [200] },
        expiration: { maxEntries: 256, maxAgeSeconds: 60 * 60 },
      },
    },
    {
      // Do not persist user-specific HTML, login responses or arbitrary third-party content.
      // The precached offline document remains the explicit navigation error fallback.
      urlPattern: () => true,
      handler: 'NetworkOnly',
      options: {},
    },
  ];
}
module.exports = { buildRuntimeCaching };
