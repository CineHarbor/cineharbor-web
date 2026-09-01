# 2026-08-31 core worker + RPC 桥（P3.c 第二块）

- round-16 的「直接动态 import 桥」改为更忠实的「**模块 Worker 挂 WASM core**」（对齐 Stremio 把
  stremio-core 跑在 worker）：
  - `public/core-worker.js`：`import` `--target web` glue → `init()` → `onmessage` RPC
    （`op ∈ core_version/manifest/catalog/meta/streams`）；init 失败/未知 op 均显式抛错，避免静默吞。
  - `src/lib/core/worker-client.ts`：`CoreWorkerClient`（`postMessage`/`onmessage`，按 `id` 分派 Promise，
    `dispose` 清理 + `terminate`）。
  - `src/lib/core/bridge.ts`：`loadCoreBridge(workerFactory?)` + `spawnCoreWorker()`
    （`new Worker("/core-worker.js", {type:"module"})`）；catalog `search`→`extra=("search",q)` 封装。
- 测试：`bridge.test.ts`（`normalizeAddonBaseUrl` + catalog 参数映射）+ `worker-client.test.ts`
  （请求/resolve、错误/reject、多请求按 id 分派）。
- 验证（exit 0）：`pnpm jest src/lib/core/{bridge,worker-client}.test.ts` 6 绿；scoped tsc
  （TS 4.9 Node16）`bridge.ts`+`worker-client.ts` 0 错。
- 规避点：DOM `Worker.onmessage`（MessageEvent）与最小 `WorkerLike`（{data}）不协变，`spawnCoreWorker`
  用 `as unknown as WorkerLike` 收窄（仅关心 `data`，语义安全）。
- 剩余 P3.c：`next dev` 实测浏览器加载 worker + glue（`--target web` 需 HTTP + 正确 wasm MIME）→
  按数据流把 `transport` 切到桥（search→douban、detail/streams→vod、live→live）→ 逐条退役 TS `/api`。