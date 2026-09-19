// Only deployment-owned public assets and explicit unauthenticated entry points.
// In particular, generated next-pwa fallback scripts must be available before login.
const publicPaths = new Set([
  '/login',
  '/warning',
  '/_offline',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/og-image.png',
  '/logo.png',
  '/screenshot.png',
  '/screenshot1.png',
  '/screenshot2.png',
  '/screenshot3.png',
  '/robots.txt',
  '/manifest.json',
  '/sw.js',
  '/core-worker.js',
  '/core-storage.js',
  '/api/login',
  '/api/register',
  '/api/logout',
  '/api/cron',
  '/api/server-config',
]);
const publicDirectories = ['/_next/', '/icons/', '/wasm/', '/backdrops/'];
const generatedWorkerScript = /^\/(?:workbox|worker|fallback)-[A-Za-z0-9_-]+\.js$/;

export function isPublicRequestPath(pathname: string): boolean {
  if (!pathname.startsWith('/') || /[?#\\\0]/.test(pathname)) return false;
  if (pathname.split('/').some((segment) => segment === '.' || segment === '..'))
    return false;
  return (
    publicPaths.has(pathname) ||
    generatedWorkerScript.test(pathname) ||
    publicDirectories.some((prefix) => pathname.startsWith(prefix))
  );
}
