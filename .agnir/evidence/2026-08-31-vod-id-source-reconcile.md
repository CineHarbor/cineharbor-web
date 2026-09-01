# 2026-08-31 点播 id/source 还原（复合 id → 原生形状）

- `addon-content-data-source.ts` 增 `parseVodId` + `reconcileVodResult`：把 addon 复合 id
  `vod:{source}:{vid}` 还原为原生 `SearchResult` 形状（`id`=vid、`source`=站点 key、`source_name` 暂以
  key 顶替——addon 未暴露站点展示名，缺口）。`search` 与 `detail` 输出均过该方法。
- 意义：addon 搜索结果/详情与既有页面导航（`/play?source=&id=`）及原生 `/api/detail`（source=站点 key）
  兼容；详情接线的 wrinkle ①（source-key 语义）已解，剩 wrinkle ②（4 处消费全覆盖）。
- 验证：jest 2 绿（search/detail 均还原）+ 全仓 typecheck 0 错。