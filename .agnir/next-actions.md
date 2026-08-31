# cineharbor-web Next Actions

0. ~~提交并推送本次 Agnir 初始化~~ ✅ 已完成（2026-08-31）。
1. 本地开发配置 `.env.local`（含 Upstash 等密钥，不入库）。
2. 数据面边界遵循 ADR-0004：既有页面继续走 `/api`，新客户端走 local-service `/addons`。
3. `pnpm install` / `pnpm dev` / `pnpm typecheck` / `pnpm build` / `pnpm test`。

## douban-imdb-rt（评分聚合，见门面仓 `docs/plans/douban-imdb-rt-integration-plan.md`）

- ✅ P0：统一模型/缓存/匹配归一/评分 resolver + `POST /api/ratings/batch`，豆瓣真实接入；`LegacySearchPage` 已切统一接口，`VideoCard` 已加评分行；`SiteConfig` 加 `ShowDoubanRating/ShowImdbRating/ShowRtRating`。
- ⏭ P1：接入 IMDb 真实数据源（官方 datasets 的 `title.ratings.tsv.gz` 同步脚本，或官方 API key），补 `providers/imdb.ts` 的 transport；`douban_id → imdb_id` 反查映射。
- ⏭ P2：接入 RT 授权 feed（`providers/rt.ts` 的 transport），播放详情页 `app/play` 展示完整三源评分区（`IMDb x.x/10 · x万票`、`RT xx% Tomatometer`）。
- ⏭ P3：手工绑定/异常匹配回收、命中率统计、同步脚本与更多测试。