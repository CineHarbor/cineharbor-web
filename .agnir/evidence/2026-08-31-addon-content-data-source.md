# 2026-08-31 addon-content-data-source（点播两步行数据源）

- 新增 `src/lib/core/content/addon-content-data-source.ts`：`AddonContentDataSourceImpl` 依赖倒置到
  `ContentAddonPort`（`CoreAddonClient` 结构满足），实现 Stremio 忠实「两步」：
  - `search(query, skip)`：`catalog(movie+series, "search", {search,skip})` 合并 → `metasToSearchResults`
    （**元数据预览，无剧集流**）。
  - `detail(type, id)`：`meta` + `streams` 并行 → `buildDetail`（剧集流另取合成）。
- 口径：M领「对标 Stremio 到结尾」→ 搜索两步（无内联集数）为既定语义，非待决策。
- 验证：jest 2 绿（search 合并无剧集 / detail 合成）+ 全仓 typecheck 0 错。
- 下一步：vod 搜索/详情页 flag-wire（同 live `NEXT_PUBLIC_USE_ADDON_LIVE` 型：`NEXT_PUBLIC_USE_ADDON_VOD`
  默认 off），搜索页 `LegacySearchPage` + 详情/播放页接本数据源；分页/评分/成人过滤归 addon 侧外沿。