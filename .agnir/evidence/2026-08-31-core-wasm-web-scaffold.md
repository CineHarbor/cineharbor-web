# 2026-08-31 core-wasm 进 web 构建/桥骨架（P3.c 首块）

- 侦察结论（本仓数据面）：Next.js（app router）+ next-pwa（Service Worker 已配，runtimeCaching 含 `/api/`、
  排除 `/api/proxy/vod/`）。数据面两条通路（ADR-0004）：既有页面走原生 `/api`（`src/app/api/**` 大量 TS 后端：
  douban/live/vod/search/detail/proxy/image-proxy/admin/favorites/follows/playrecords...）；新客户端走
  local-service `/addons`（`src/lib/transport/addon-client.ts`）。`NEXT_PUBLIC_API_BASE_URL`（默认 local-service）。
- 落地 P3.c 首块「WASM core 可进 web 的构建 + 桥」：
  - `scripts/build-core-wasm.mjs`：cargo build `cineharbor-core-web`（wasm32）+ `wasm-bindgen --target web`
    → `public/wasm/`；CARGO_HOME 旁暖缓存回退、cargo/wasm-bindgen 缺失显式退出。
  - `src/lib/core/bridge.ts`：类型化薄客户端桥 `loadCoreBridge()`（`--target web` init）+ `coreVersion` +
    `addon{Manifest,Catalog,Meta,Streams}Json`（camelCase 映射 + catalog `search`→`extra=("search",q)` 封装）
    + `normalizeAddonBaseUrl`。
  - `src/lib/core/bridge.test.ts`：`normalizeAddonBaseUrl`。
- 验证（exit 0）：`node scripts/build-core-wasm.mjs` 产出 `public/wasm/cineharbor_core_web.{js,_bg.wasm,d.ts}`，
  导出 `addon_{manifest,catalog,meta,streams}_json` + `core_version` + `default_sync_domains`；`pnpm jest
  src/lib/core/bridge.test.ts` 1 绿；scoped tsc（TS 4.9 / Node16）`bridge.ts` 0 错。
- 剩余 P3.c：`next dev` 联调确认 webpack 对 `/wasm/...` 变量动态导入的运行时解析 → Worker 挂 wasm core →
  按数据流把 transport 切到桥（search→douban、detail/streams→vod、live→live）→ 逐条退役对应 TS `/api`。
- 输出文件（本文本改动作）留待用户授权后 push，生成物 `public/wasm/`（build 产物）不入库由脚本生成。