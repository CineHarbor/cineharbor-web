# 2026-08-31 core 浏览器存储 seam（P3.b，IndexedDB）

- 解除原 defer 阻塞：P3.b 之前因「node 无 IndexedDB、需 fake-indexeddb」搁置；改用 headless Chrome + CDP
  实测（round 19 建的 harness），无需 polyfill。
- 设计（与 ADR-0006「core = 纯状态机、无 IO」一致）：浏览器持久化放 **host 侧**（模块 worker 的 IndexedDB）。
  native host 用 sqlite（local-service），browser host 用 IndexedDB；core 侧 `core::storage::Storage` 是
  host 提供的抽象，**不在 wasm 里实现**（该 trait `Send + Sync`，wasm 的 JS 互操作对象为 `!Send`，且纯化后
  core 本就不做 IO）。
- 改动：
  - `public/core-worker.js`：新增 `storage_get/set/remove`（IndexedDB 库 `cineharbor`，objectStore `kv`；
    `openDb` 懒加载单例；readwrite 事务 `oncomplete`、readonly `request.onsuccess`、`onerror` 显式 reject）。
  - `src/lib/core/storage-client.ts`：`CoreStorageClient`（`get` 保留 `string | null` 语义：缺键→null、空串→空串）。
  - `scripts/wasm-cdp-smoke.mjs`：扩到存储流 + 跨 worker 持久化断言。
- 验证（exit 0）：jest **14 绿**（4 套件）；`pnpm typecheck` 全仓 0 错；浏览器
  `SMOKE_RESULT=…getAfterSet:"v1", getAfterRemove:null, persist:"P123"`——`persist` 经全新 worker 读回，
  证明 IndexedDB 跨 worker 持久化。