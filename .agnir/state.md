# cineharbor-web Current State

CineHarbor Web 客户端（Next.js + PWA），对应 Stremio `stremio-web`。P4 阶段迁入。

- 数据面两条通路（边界见 ADR-0004）：
  - 既有页面（搜索/播放/直播）走原生 `/api`（「来源 + 剧集」富模型）。
  - `cineharbor-local-service` 的 `/addons` 聚合端点服务 Stremio 双向互操作与桌面壳等新客户端；`src/lib/transport/addon-client.ts` 为传输层。
- 常用命令：`pnpm dev`（含生成 PWA manifest）/ `pnpm typecheck` / `pnpm build` / `pnpm test`。
- 环境变量见旧项目 `.env.local`（含 Upstash 等密钥），本地开发需自行配置；敏感值不入库。
- 三源评分聚合（2026-08-31 P0 落地）：`src/lib/ratings/`（types/cache/title-normalize/title-match/resolver/providers）+ `POST /api/ratings/batch`；豆瓣真实接入，IMDb/RT 经 `IMDB_RATINGS_JSON` / `RT_RATINGS_JSON` 门控优雅降级；搜索页 `LegacySearchPage` 已切统一接口，`VideoCard` 已展示评分行。
- 许可证：CC BY-NC-SA 4.0。
