# 2026-08-31 退役 local-service `/addons` 聚合客户端（transport/addon-client.ts）

- 退役 `src/lib/transport/addon-client.ts` + `addon-client.test.ts`：local-service `/addons/*` 聚合客户端
  （`fetchAddonCollection/Catalog/Meta/Streams` + `buildAddonUrl/buildCatalogPath`），ADR-0006 起被
  worker 直连 `CoreAddonClient` 取代且**零页面消费**（grep 确认无生产调用方）。
- 抽取共用协议 DTO 到 `src/lib/transport/addon-types.ts`：`AddonContentType` / `AddonMeta` / `AddonStream` /
  `AddonCatalogResponse` / `AddonStreamsResponse` / `AddonMetaResponse`；更新 6 个引用文件
 （core-addon-client、catalog-bridge、streams-bridge、addon-live-client + 2 测试）。
- 验证（exit 0）：`rg` 无残留 `addon-client` 导入（仅注释）；jest 120 套件 / 558 测绿（-2 删去的死码测试）；
  typecheck 0 错。
- 备注：web 侧客户端已退役；local-service 侧 `/addons/*` 路由仍保留（desktop 可能消费），其退役归
  desktop/local-service 对齐阶段（P4 尾）。