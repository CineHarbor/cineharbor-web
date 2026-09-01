# 2026-08-31 跨源浏览器端到端（真实 live addon 直连，终局闭环）

- 新增 `scripts/addon-cross-origin-smoke.mjs`：真实 headless Chrome 里，**A 源**（smoke server 随机端口）
  页面内 `new Worker('/core-worker.js')` → wasm core，**直连 B 源**（真实 standalone `cineharbor-addon-live`
  :11472，喂真实 M3U 3 频道）。exit 0，输出：
  `CROSS_ORIGIN_RESULT={"pageOrigin":"http://127.0.0.1:53798","addonBase":"http://127.0.0.1:11472",
  "version":"0.1.0","manifestId":"community.live","catalogCount":3,"firstChannel":"CCTV-1 综合",
  "metaName":"CCTV-1 综合","streamUrl":"http://127.0.0.1:11472/media/live/m3u8?cineharbor-source=m3u8&url=..."}`
- 意义：这是「浏览器 addon HTTP 直连」的**终局证明**——CORS（round 21）+ wasm fetch 管线（round 19-20）
  + 真实 addon（跨源）全链路闭环：manifest/catalog/meta/streams 四桥在跨源下全部成功，stream 回转链 URL。
- 脚本修复：addon-sdk 相对路径多一层 `..`（`/Users/jay/Code/CineHarbor/cineharbor-addon-sdk` 才是兄弟目录），
  导致 `spawn cargo` cwd 不存在报 ENOENT；改为 `resolve(webRoot,"..","cineharbor-addon-sdk")` + cargo 绝对路径
  + `ADDON_SPAWN_ERROR` 诊断。
- 依赖：`public/core-worker.js` + `public/wasm/*`（`scripts/build-core-wasm.mjs` 产物）须先构建；Chrome + node22 + cargo。