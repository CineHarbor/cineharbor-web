# 2026-08-31 点播详情/播放页 addon 直连切面（开关，默认 off）

- `src/lib/content-discovery-client.ts` `fetchContentDetail({source,id})`：新增 addon 直连分支（`USE_ADDON_VOD`
  && `typeof window !== "undefined"`），从复合 id `vod:{source}:{id}`（已是复合则原样）调
  `getAddonContentDataSource().detail("movie", addonId)`，null → 抛「获取视频详情失败」。
- 单点收口：play / DownloadsClient / follow-updates / downloadable 四消费方共用此函数，一处接线全覆盖。
- 服务端安全：静态 import 工厂（bridge/worker-client 模块加载不触碰浏览器 API），`window` 守卫确保 SSR/
  server-route 回退原生 `/api/detail`。
- 验证：全仓 typecheck 0 错 + jest 122 套件/562 测全绿（分支默认 off，测试走原生，零回归）。
- 已知：detail 调 addon `meta`+`streams` 两步，addon 侧对同一 vid 抓取两次（两步架构固有；addon 侧可后加
  结果缓存优化，非本切面阻塞）。

## 点播切面至此全通
搜索（预览，两步）→ 详情（meta+stream 合成，类型自证 + id/source 还原）已全部按 `NEXT_PUBLIC_USE_ADDON_VOD`
接通，默认 off、零回归。待 Matt 交互验证后退役 `/api/search*`（非 ws）+ `/api/detail`。