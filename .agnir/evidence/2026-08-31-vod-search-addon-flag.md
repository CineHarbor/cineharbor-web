# 2026-08-31 点播搜索页 addon 直连切面（开关，默认 off）

- 新增 `src/lib/core/content/addon-content-data-source-factory.ts`：`USE_ADDON_VOD`
  （`NEXT_PUBLIC_USE_ADDON_VOD === "true"`，默认 off）+ 同步单例 `getAddonContentDataSource()`
  （首次才 `loadCoreBridge()`，按 vod base 构造，jest 2 绿）。
- `src/components/search/LegacySearchPage.tsx` 传统搜索路径（非 SSE 流式）接线：`fetchContentSearchResults`
  处三元切换到 `getAddonContentDataSource().search(trimmed)`（原生 `SearchResult[]` 形状不变；SSE 流式
  `/api/search/ws` 无 addon 对等，保持原生）。
- 验证：全仓 typecheck 0 错；jest 回归（120+ 套件全绿，见 2026-08-31 汇总）。
- addon 模式降级（已注明）：搜索结果为元数据预览（无内联集数）；无多源聚合/成人过滤/评分排序
  （`content/service.ts` 的聚合/过滤是待退役的 TS 后端，addon 侧为外沿打磨项）。
- 剩余点播切面：详情/播放页 `fetchVideoDetail.ts` + `content-discovery-client.fetchContentDetail` →
  `getAddonContentDataSource().detail(type, id)`（需从搜索结果拿 type），再退役 `/api/detail`；
  `playback-source-prefetch`/下载 的 addon 化归外沿。