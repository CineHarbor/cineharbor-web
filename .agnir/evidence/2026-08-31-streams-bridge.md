# 2026-08-31 streams-bridge（点播剧集流 shape-bridge）

- 新增 `src/lib/core/content/streams-bridge.ts`：补全 `catalog-bridge`（只产元数据骨架、`episodes` 恒空）
  的剧集流映射，完成 vod 详情「两步走」（Stremio `/meta` + `/stream`）纯映射层。
  - `streamsToEpisodes(streams)`：`url→episodes`、`title||name||第N集→episodes_titles`，无 url 流跳过。
  - `buildDetail(meta, streams, opts)`：`metaToSearchResult(meta)` + 剧集流合成完整 `SearchResult`。
- 语义核对：`SearchResult.episodes` = 各集已转链 m3u8（`play/page.tsx` 用 `episodes[idx]` 直播），本桥
  直接填 `stream.url`，无二次代理。
- 验证：jest 3 绿（映射回退 / 跳无 url / buildDetail 合成）+ 全仓 typecheck 0 错。
- 下一步（点播页切面，最大）：搜索=`catalog({search})`→catalog-bridge（无剧集）；详情=`meta(id)`+
  `stream(id)`→buildDetail；涉及 `/api/search*` + `/api/detail` 7 条路由 + `playback-source-prefetch`/成人过滤/
  下载。需 Matt 定富模型映射决策（分页/排序/评分/成人过滤）后执行。