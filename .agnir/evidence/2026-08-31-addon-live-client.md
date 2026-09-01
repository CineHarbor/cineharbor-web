# 2026-08-31 addon-live-client（live 页 addon 直连数据源）

- 新增 `src/lib/core/live/addon-live-client.ts`：`AddonLiveClient` 依赖倒置到 `LiveAddonPort`
  （`CoreAddonClient` 结构满足），暴露：
  - `listChannels()`：`catalog("tv","channels")` → `AddonLiveChannel{id,name,logo,group,tvgId}`
    （poster/description 缺省回退空串；tvgId 恒空——addon 尚未带 tvg-id，EPG 缺口）。
  - `getStreamUrl(id)`：`streams("tv",id)` → 第一条已转链流 url；无流抛错。
- 验证（exit 0）：jest 3 绿（映射 + 缺省回退、流 url、无流抛错）+ 全仓 typecheck 0 错。
- 定位 live 页 seam：`src/app/live/page.tsx`（1093+ 行）消费 `fetchLiveSources` / `fetchLiveChannels` /
  `precheckLiveStream`（`transport/live-client.ts`），含多源选择（L339）、频道（L398）、预检（L1093）。
- 切走前缺口：addon 单源、无 tvg-id/EPG/precheck、logo 直链；native live 为多源 + EPG + precheck。
  故页面切面前需补 addon **多源 parity**（每源一个 `catalog/tv/{key}` + 频道 id `live:{key}:{idx}` +
  per-source UA 入 `ProxyParts.sources`）或先单源切入 + 保留原生多源 fallback。