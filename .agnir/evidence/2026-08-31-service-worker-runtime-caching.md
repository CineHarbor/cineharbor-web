# 2026-08-31 Service Worker runtimeCaching（P3.d 薄客户端缓存）

- 抽摸：`src/lib/core/service-worker/runtime-caching.js`（CJS，`buildRuntimeCaching(isSameOrigin)` 工厂，
  供 `next.config.js` next-pwa 直接用）。`next.config.js` 改 `runtimeCaching: buildRuntimeCaching((url) => self.origin === url.origin)`。
- 三条业务缓存（叠加 next-pwa 默认）：
  - `core-wasm`：同源 `/core-worker.js` + `/wasm/*` CacheFirst 长期固化（薄客户端运行时，1 年 / 32 条）。
  - `addon-meta`：跨源 `manifest.json` + `/catalog/*` + `/meta/*` StaleWhileRevalidate（1 小时 / 256 条）；
    **不含 `/media/*`**（流不放 SW）。
  - `apis`：原生 `/api` 同源缓存，仍排除 `/api/auth/`、`/api/proxy/vod/`（后者即待退役的媒体代理）。
- 验证（exit 0）：jest `runtime-caching.test.js` 3 绿（core-wasm 同源/跨源判定、addon-meta 跨源命中 + 排除
  /media、apis 排除 auth/proxy/vod）；全仓 jest 117 套 / 549 测全绿；`pnpm typecheck` 0 错；`require('./next.config.js')` 载入正常。
- 边界：SW 运行时拦截（真实 production build + 浏览器 SW）未端到端验证，缓存语义由单测锁定；出现误缓存再按
  `url.pattern` 收窄即可。