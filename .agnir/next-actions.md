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

## 薄客户端（ADR-0006 P3 迁入）

- ✅ 首块：`scripts/build-core-wasm.mjs`（core-web → `public/wasm/`）+ `src/lib/core/bridge.ts`（四桥 + `loadCoreBridge`）+ jest/tsc 验证。
- ✅ Worker 挂 core：`public/core-worker.js`（模块 Worker + `--target web` glue + RPC）+ `src/lib/core/worker-client.ts`（CoreWorkerClient）；jest 6 绿 / tsc 0 错。
- ✅ 直连适配器：`src/lib/transport/core-addon-client.ts`（`CoreAddonClient` 复用 addon 类型 + `getAddonProviderConfig`）；jest 11 绿 / 全仓 typecheck 0 错。
- ✅ 浏览器端到端：`scripts/wasm-cdp-smoke.mjs`（headless Chrome + CDP）验证 worker/glue + 四桥直连 mock addon（`SMOKE_RESULT` 真实四桥 JSON）。
- ✅ 浏览器存储：`public/core-worker.js` `storage_*`（IndexedDB）+ `src/lib/core/storage-client.ts`；浏览器 E2E 验证 set/get/remove + 跨 worker 持久化。
- ✅ shape-bridge：`src/lib/core/content/catalog-bridge.ts`（meta→SearchResult 骨架，jest 3 绿 + 全仓 typecheck 0 错）。
- ✅ 媒体代理切面首件：`src/lib/core/media/addon-media-proxy.ts`（addon 直连 `/media/{vod,live}/*` 构造器，对齐 Rust，jest 4 绿）。
- ✅ 媒体代理切面接线：`download/proxy-url.ts` 加 `USE_ADDON_MEDIA_PROXY` 开关（vod 下载侧 → addon `/media/vod/*`，缺省 off，jest 3 绿 + 回归 14 绿）。
- ✅ 跨源浏览器端到端：`scripts/addon-cross-origin-smoke.mjs`（A 源 wasm worker 直连 B 源真实 live addon，四桥全通 + 回转链 URL）。
- ✅ P3.d Service Worker：`runtime-caching.js`（core-wasm 固化 + addon 元数据 SWR + /api 排 auth/proxy），jest 3 绿 + 全仓 549 测绿。
- ✅ live 页数据源：`src/lib/core/live/addon-live-client.ts`（listSources/listChannels/getStreamUrl，依赖倒置，jest 4 绿，多源 aware）。
- ✅ live 页切面接好（首个页面级）：`live/page.tsx` + `addon-live-source-factory.ts`，`NEXT_PUBLIC_USE_ADDON_LIVE`（默认 off）切源/频道/播放到 addon 直连；typecheck 0 错 + jest 555 绿。
- ⏭ Matt `NEXT_PUBLIC_USE_ADDON_LIVE=true pnpm dev` 交互验证 live 页 → 验证后退役 `/api/live/*` + `/api/proxy/m3u8|segment|key`。
- ✅ 点播 shape-bridge 补全：`streams-bridge.ts`（streamsToEpisodes + buildDetail，jest 3 绿）。
- ✅ 退役 local-service `/addons` 聚合客户端：`transport/addon-client.ts` 删除，协议 DTO 迁 `addon-types.ts`（jest 558 绿）。
- ✅ 点播两步数据源：`addon-content-data-source.ts`（search 预览 / detail=meta+stream，jest 2 绿）；口径已定（Stremio 两步，Matt 指令）。
- ✅ 点播搜索页切面接好：`LegacySearchPage`（传统搜索）`NEXT_PUBLIC_USE_ADDON_VOD`（默认 off）→ `AddonContentDataSource.search`；typecheck 0 错。
- ✅ 点播 id/source 还原：`addon-content-data-source.ts`（parseVodId/reconcileVodResult，jest 2 绿）——复合 id → 原生 `{id=vid, source=站点key}`，搜索/详情均兼容原生导航。
- ✅ 点播详情/播放页切面接好：`content-discovery-client.ts` `fetchContentDetail` 按 `USE_ADDON_VOD`（默认 off、window 守卫）直连 `detail('movie', vod:{source}:{id})`，四消费方单点收口；typecheck 0 错 + jest 562 绿。点播切面（搜索+详情）至此全通。
- ✅ 点播跨源浏览器 E2E：`scripts/vod-cross-origin-smoke.mjs` → `VOD_CROSS_ORIGIN_RESULT`（catalog 2 / meta 1 视频 / streams 1 转链）。live+vod 两真实 cross-origin E2E 均过。
- ⏭ Matt 验证后退役：`/api/search*`（非 ws）+ `/api/detail` + `/api/live/*` + `/api/proxy/*`；prefetch/下载 addon 化归外沿 → 豆瓣 → 账户。
- ⏭ 数据流切换 + 退役：按门面 `docs/plans/web-api-retirement-plan.md` 逐切面执行（媒体代理→直播→点播→豆瓣→账户/历史→鉴权/admin）。addon 核心 parity 已基本到位（复核见 addon-sdk `2026-08-31-addon-parity-audit.md`）；剩外沿功能（douban ratings、live EPG/多源）+ shape-bridge + 页面接线。