// Remove legacy HTTP response caches that could contain account data or stale WASM.
// Keep IndexedDB, intentional download storage and Workbox's revisioned precache intact.
const retiredCaches = new Set([
  'apis',
  'others',
  'cross-origin',
  'core-wasm',
  'addon-meta',
  'cineharbor-public-addon-meta-v1',
  'static-audio-assets',
  'static-video-assets',
  'static-data-assets',
  'static-js-assets',
  'static-style-assets',
  'next-data',
  'next-image',
  'static-image-assets',
  'static-font-assets',
  'google-fonts-webfonts',
  'google-fonts-stylesheets',
  'start-url',
]);
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => retiredCaches.has(name))
            .map((name) => caches.delete(name))
        )
      )
  );
});
