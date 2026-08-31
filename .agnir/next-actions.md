# cineharbor-web Next Actions

0. **推送本次改动**：`main` 领先 `origin/main` 若干提交（ratings P0 / 品牌构建修复 / 主题色单一来源 / checkpoint / IMDb P1）；推送走 `github.com-matt`（需用户明确授权后再 push）。
1. 本地开发配置 `.env.local`（含 Upstash 等密钥，不入库）。
2. 数据面边界遵循 ADR-0004：既有页面继续走 `/api`，新客户端走 local-service `/addons`。
3. `pnpm install` / `pnpm dev` / `pnpm typecheck` / `pnpm build` / `pnpm test`。

## douban-imdb-rt（评分聚合，见门面仓 `docs/plans/douban-imdb-rt-integration-plan.md`）

- ✅ P0：统一模型/缓存/匹配归一/评分 resolver + `POST /api/ratings/batch`，豆瓣真实接入；`LegacySearchPage` 已切统一接口，`VideoCard` 已加评分行；`SiteConfig` 加 `ShowDoubanRating/ShowImdbRating/ShowRtRating`。
- ✅ P1：IMDb 官方 datasets 零 key 接入 —— `pnpm sync:imdb`（`scripts/sync-imdb.js`）生成 `data/imdb-index.json`；`providers/imdb.ts` 按「显式 imdb_id」或「标题+年份」匹配（含中文别名 via `title.akas`）；标题归一键单一来源 `imdb/title-key.js`（运行时 + 同步脚本共用）；播放详情页 `app/play` 已展示 IMDb。
- ⏭ P2：接入 RT 授权 feed（`providers/rt.ts` 的 transport），播放详情页 `app/play` 补齐完整三源评分区（`RT xx% Tomatometer`；IMDb 已上）。
- ⏭ P3：手工绑定/异常匹配回收（现按 `title-match` 的 `douban_anchor` 策略打分）、命中率统计、同步脚本更多测试。

## 构建 / 品牌

- 品牌主题色单一来源 `NEXT_PUBLIC_THEME_COLOR`（默认 `#0B1220`），`generate-manifest.js` 与 `app/layout.tsx` theme-color meta 读同一变量；改色只改 env 一处。