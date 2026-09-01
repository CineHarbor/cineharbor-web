# 2026-08-31 core 直连传输适配器（P3.c 第三块）

- 落地「addon HTTP 直连」传输 seam：`src/lib/transport/core-addon-client.ts`
  - `CoreAddonClient`（持有 `CoreBridge` + addon `baseUrl`）：`manifest()` / `catalog(type, id, {search,skip})`
    / `meta(type,id)` / `streams(type,id)`，全部经 worker 桥的 wasm 侧 fetch 直连 standalone addon。
  - 复用 `addon-client.ts` 的 `AddonMeta/AddonStream/AddonCatalogResponse/MetaResponse/StreamsResponse`
    避免重复定义；新增单 addon `CoreManifest`（含 `catalogs`/`idPrefixes`）。
  - `parseJson`：空响应 / 非法 JSON 显式抛错（无空 catch）。
  - `getAddonProviderConfig`：douban `http://127.0.0.1:11471`、live `…:11472`、vod `…:11473`，
    `NEXT_PUBLIC_{DOUBAN,VOD,LIVE}_ADDON_URL` 可覆盖（密钥/配置走环境变量）。
  - strangler 位置：与 local-service `/addons` 版 `addon-client.ts` 并列于 `transport/`，页面切走后删旧版。
- 验证（exit 0）：`pnpm jest src/lib/transport/core-addon-client.test.ts src/lib/core/{bridge,worker-client}.test.ts`
  11 绿；`pnpm typecheck`（全仓，`--incremental false`）0 错。
- 剩余 P3.c：页面按数据流改用 `CoreAddonClient`（search→douban、detail/streams→vod、live→live）+
  `next dev` 实测 worker/glue 加载 → 逐条退役 TS `/api`。