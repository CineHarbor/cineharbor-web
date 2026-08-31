# cineharbor-web Current State

CineHarbor Web 客户端（Next.js + PWA），对应 Stremio `stremio-web`。P4 阶段迁入。

- 数据面两条通路（边界见 ADR-0004）：
  - 既有页面（搜索/播放/直播）走原生 `/api`（「来源 + 剧集」富模型）。
  - `cineharbor-local-service` 的 `/addons` 聚合端点服务 Stremio 双向互操作与桌面壳等新客户端；`src/lib/transport/addon-client.ts` 为传输层。
- 常用命令：`pnpm dev`（含生成 PWA manifest）/ `pnpm typecheck` / `pnpm build` / `pnpm test`。
- 环境变量见旧项目 `.env.local`（含 Upstash 等密钥），本地开发需自行配置；敏感值不入库。
- 三源评分聚合：`src/lib/ratings/`（types/cache/title-normalize/title-match/resolver/providers）+ `POST /api/ratings/batch`。
  - P0（已落地）：豆瓣真实接入；IMDb/RT 优雅降级；搜索页 `LegacySearchPage` 已切统一接口，`VideoCard` 已展示评分行。
  - P1（已落地，零 key）：IMDb 官方 datasets 同步脚本 `scripts/sync-imdb.js`（`pnpm sync:imdb`，下载 `title.basics/akas/ratings` → 浓缩为 `data/imdb-index.json`，`IMDB_INDEX_PATH` 覆盖路径）；`providers/imdb.ts` 按「显式 imdb_id」或「标题+年份」匹配取评分（`title-normalize.ts` 与同步脚本共用 `imdb/title-key.js` 单一归一键，防 drift）；播放详情页 `app/play` 已展示 IMDb 评分。
  - P2（待续）：RT 真实数据源 transport + 播放详情页完整三源评分区；P3 手工绑定/统计。
- 品牌主题色单一来源 `NEXT_PUBLIC_THEME_COLOR`（默认 `#0B1220`），manifest 与 layout theme-color 读同一变量；`generate-manifest.js` 已补齐品牌色 + maskable 图标（与提交版 manifest 幂等）。
- 许可证：CC BY-NC-SA 4.0。
