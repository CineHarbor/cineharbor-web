# 2026-08-31 live 页 addon 直连切面（开关，默认 off）

- 新增 `src/lib/core/live/addon-live-source-factory.ts`：`USE_ADDON_LIVE`
  （`process.env.NEXT_PUBLIC_USE_ADDON_LIVE === "true"`，默认 off）+ 同步单例
  `getAddonLiveDataSource()`（首次调用才 `loadCoreBridge()` spawn worker，复用单例）。
- `src/app/live/page.tsx`（1956 行，首个页面级切面）三处接线：
  - `fetchLiveSources` / `fetchChannels`：`USE_ADDON_LIVE` 时改走 `AddonLiveDataSourceImpl`
    （native `LiveSource[]/LiveChannel[]` 形状不变）。
  - 播放器 `preload` effect：addon 直连跳过 `precheckLiveStream`（恒 m3u8）、`targetUrl = videoUrl`
    （不再 `buildLiveStreamProxyUrl` 二次交给原生代理）。
- 验证：全仓 typecheck 0 错 + jest 119 套件 / 555 测全绿（较上轮 +6：addon-live-client / addon-live-source）。
- addon 模式降级（已注明）：无预检（恒 m3u8）、无 EPG（tvgId 空，页面 `tvgId||name` 回退）、logo 暂走原生
  `/api/proxy/logo`、每频道一次本地 stream 请求（无上游抓取）。
- 下一步（交互验证 + 退役）：Matt `NEXT_PUBLIC_USE_ADDON_LIVE=true pnpm dev` 验证 live 页 → 验证后退役
  `/api/live/*` + `/api/proxy/m3u8|segment|key`（logo 代理待补 addon parity 后退役）。