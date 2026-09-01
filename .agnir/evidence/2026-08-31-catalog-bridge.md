# 2026-08-31 catalog shape-bridge + P4 退役方案（数据流切换起始）

- shape-bridge 首件：`src/lib/core/content/catalog-bridge.ts` —— Stremio `meta` → rich `SearchResult`
  骨架（`episodes` 恒空、`poster/year/desc` 缺省回退；`source/source_name/class/type_name` 映射）。语义约束：
  Stremio 分离 meta/streams，剧集由后续 streams-bridge 调 `/stream` 另填。jest 3 绿 + 全仓 typecheck 0 错。
- P4 退役方案：`cineharbor/docs/plans/web-api-retirement-plan.md` —— 终态映射表（每条原生 `/api` 组 →
  addon 载体 → parity 缺口）、6 条切面顺序（媒体代理→直播→点播→豆瓣→账户/历史→鉴权/admin）、逐条验收门。
- 结论：技术底座（dual-compile / addon / 媒体代理 / worker / 存储 / CORS）已闭环；剩余是 addon parity +
  逐切面数据流切换 + 退役，按上述方案执行。