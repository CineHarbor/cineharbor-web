// 薄客户端 Service Worker runtimeCaching（供 next.config.js 的 next-pwa 使用）。
//
// 终态薄客户端：wasm core 资产需长期固化；addon 元数据（manifest/catalog/meta，跨源）可 SWR 缓存；
// 原生 /api 仅同源缓存（排除 auth 与将被退役的媒体 proxy）。isSameOrigin 由调用方注入（SW 里用
// `self.origin`，单测注入固定 origin），避免把 `self` 写死在模块里。

const defaultRuntimeCaching = require('next-pwa/cache');

function buildRuntimeCaching(isSameOrigin) {
  const tail = defaultRuntimeCaching.map((entry) => {
    if (entry?.options?.cacheName !== 'apis') {
      return entry;
    }

    return {
      ...entry,
      urlPattern: ({ url }) => {
        if (!isSameOrigin(url)) {
          return false;
        }
        const pathname = url.pathname;
        if (pathname.startsWith('/api/auth/')) {
          return false;
        }
        if (pathname.startsWith('/api/proxy/vod/')) {
          return false;
        }
        return pathname.startsWith('/api/');
      },
    };
  });

  return [
    ...tail,
    {
      // wasm core + worker：薄客户端运行时，CacheFirst 长期固化。
      urlPattern: ({ url }) =>
        isSameOrigin(url) &&
        (url.pathname === '/core-worker.js' || url.pathname.startsWith('/wasm/')),
      handler: 'CacheFirst',
      options: {
        cacheName: 'core-wasm',
        expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 365 },
      },
    },
    {
      // addon 元数据（跨源）：manifest/catalog/meta 用 StaleWhileRevalidate；不带 /media/*（流不放 SW 缓存）。
      urlPattern: ({ url }) =>
        url.pathname === '/manifest.json' ||
        url.pathname.includes('/catalog/') ||
        url.pathname.includes('/meta/'),
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'addon-meta',
        expiration: { maxEntries: 256, maxAgeSeconds: 60 * 60 },
      },
    },
  ];
}

module.exports = { buildRuntimeCaching };