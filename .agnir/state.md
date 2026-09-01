# cineharbor-web Current State

CineHarbor Web 客户端（Next.js + PWA），对应 Stremio `stremio-web`。P4 阶段迁入。

- 数据面两条通路（边界见 ADR-0004）：
  - 既有页面（搜索/播放/直播）走原生 `/api`（「来源 + 剧集」富模型）。
  - `cineharbor-local-service` 的 `/addons` 聚合端点服务 Stremio 双向互操作与桌面壳等新客户端；`src/lib/transport/addon-client.ts` 为传输层。
- 薄客户端（ADR-0006/P3）：`scripts/build-core-wasm.mjs` 产出 `public/wasm/` 的 `cineharbor-core-web` glue；`public/core-worker.js`（模块 Worker 挂 WASM core）+ `src/lib/core/worker-client.ts`（RPC）+ `src/lib/core/bridge.ts`（`loadCoreBridge()` 四桥）+ `src/lib/transport/core-addon-client.ts`（`CoreAddonClient` 直连 standalone addon）。浏览器端到端已验证（`scripts/wasm-cdp-smoke.mjs`）。
- 浏览器存储 host 侧 IndexedDB：`public/core-worker.js` `storage_*` + `src/lib/core/storage-client.ts`（`CoreStorageClient`）。
- 常用命令：`pnpm dev`（含生成 PWA manifest）/ `pnpm typecheck` / `pnpm build` / `pnpm test`。
- 环境变量见旧项目 `.env.local`（含 Upstash 等密钥），本地开发需自行配置；敏感值不入库。
- 三源评分聚合：`src/lib/ratings/`（types/cache/title-normalize/title-match/resolver/providers）+ `POST /api/ratings/batch`。
  - P0（已落地）：豆瓣真实接入；IMDb/RT 优雅降级；搜索页 `LegacySearchPage` 已切统一接口，`VideoCard` 已展示评分行。
  - P1（已落地，零 key）：IMDb 官方 datasets 同步脚本 `scripts/sync-imdb.js`（`pnpm sync:imdb`，下载 `title.basics/akas/ratings` → 浓缩为 `data/imdb-index.json`，`IMDB_INDEX_PATH` 覆盖路径）；`providers/imdb.ts` 按「显式 imdb_id」或「标题+年份」匹配取评分（`title-normalize.ts` 与同步脚本共用 `imdb/title-key.js` 单一归一键，防 drift）；播放详情页 `app/play` 已展示 IMDb 评分。
  - P2（待续）：RT 真实数据源 transport + 播放详情页完整三源评分区；P3 手工绑定/统计。
- 品牌主题色单一来源 `NEXT_PUBLIC_THEME_COLOR`（默认 `#0B1220`），manifest 与 layout theme-color 读同一变量；`generate-manifest.js` 已补齐品牌色 + maskable 图标（与提交版 manifest 幂等）。
- 许可证：CC BY-NC-SA 4.0。
- Agnir 操作基线：`iorLab/agnir` 稳定发布 `v0.1.0`（revision `2a0cb7bf2068b11f361e315670b2f2dc497b2588`，distribution `agnir-agent-skill`），2026-09-01 兼容操作升级。
