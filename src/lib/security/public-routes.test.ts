import { isPublicRequestPath } from './public-routes';

describe('public deployment assets before authentication', () => {
  it.each([
    '/sw.js', '/workbox-9dc5519c.js', '/worker-Build_42.js',
    '/fallback-Build_42.js', '/_offline', '/core-worker.js', '/core-storage.js',
    '/wasm/cineharbor_core_web_bg.wasm', '/wasm/build-info.json',
    '/icons/icon-512-maskable.png', '/backdrops/ch-day-valley.png',
    '/apple-touch-icon.png', '/favicon-32x32.png', '/og-image.png',
    '/screenshot1.png', '/_next/static/chunks/main-app.js',
    '/login', '/api/login', '/api/server-config',
  ])('allows only the declared public path %s', (pathname) => {
    expect(isPublicRequestPath(pathname)).toBe(true);
  });
  it.each([
    '/api/history', '/api/admin', '/api/profile/bootstrap', '/api/login/admin',
    '/api/server-config/private', '/_next-api', '/worker-secret.json',
    '/fallback-secret.js/extra', '/fallback-.js', '/wasm-private/key',
    '/logo.png/private', '/backdrops/../api/history', '/wasm/./private',
    '/wasm/file?token=secret', '/wasm/file\\private', 'sw.js',
  ])('does not accidentally exempt protected or malformed paths %s', (pathname) => {
    expect(isPublicRequestPath(pathname)).toBe(false);
  });
});
