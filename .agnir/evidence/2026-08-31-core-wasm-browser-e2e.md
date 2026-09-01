# 2026-08-31 core wasm 浏览器端到端（P3.c 关键祛魅）

- 目标：消除「module Worker + `--target web` glue 真能在浏览器加载」的不确定（此前仅 node/jest 验证）。
- 手段（零 npm 依赖）：Google Chrome 151 headless + node 22 `globalThis.WebSocket` 直连 CDP。
  - `scripts/wasm-smoke.mjs`：静态 serve `public/`（`.js`→text/javascript、`.wasm`→application/wasm）+
    同源 mock addon（`/manifest.json`、`/catalog/movie/top.json`、`/meta/...`、`/stream/...`，协议 schema），
    `/` 提供冒烟页。
  - `scripts/wasm-cdp-smoke.mjs`：拉 `--headless=new --remote-debugging-port=0` Chrome，`Runtime.evaluate`
    （`awaitPromise:true`）在页面上下文跑 worker 流，直接取 Promise 结果（避开 `--dump-dom` 与异步竞态）。
- 结果（exit 0）：
  `SMOKE_RESULT={"version":"0.1.0","manifestId":"mock","catalogCount":1,"metaName":"Test Movie","streamName":"Demo","streamUrl":"http://example.test/demo.m3u8"}`
- 结论：真实浏览器中 `new Worker('/core-worker.js',{type:'module'})` → 加载 `--target web` glue →
  wasm 实例化（`core_version` 返回 0.1.0）→ wasm 内 `FetchHttpClient` 走 `fetch` 直连 addon → 四桥全通。
  P3.c「WASM core + addon HTTP 直连」链路在浏览器侧成立。
- 剩余 P3.c：页面实际接入 `CoreAddonClient`（数据流切换）+ 退役 TS `/api`；
  （可选）把 smoke 指到真实 standalone addon 复验一次。