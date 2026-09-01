# 2026-08-31 addon 媒体代理直连构造器（媒体代理切面的首件）

- 新增 `src/lib/core/media/addon-media-proxy.ts`：addon 媒体代理直连 URL 构造器，**逐项对齐 Rust
  `cineharbor-media`**——vod `?source=&url=`、live `?cineharbor-source=&url=[&allowCORS=true]`，
  path `/media/{vod,live}/{m3u8,segment,key}`；用 `URLSearchParams` 与 Rust `form_urlencoded` 编码一致。
- 验证：jest 4 绿 + 全仓 typecheck 0 错；URL 字符串与 Rust 构造结果一致（round 23 已实跑 live addon
  stream 回 `/media/live/m3u8?cineharbor-source=m3u8&url=...`）。
- 定位：媒体代理切面（P4 第一条，零 UI 语义变化）的第一 slice。下一步 = 把消费侧（下载
  `download/vod-proxy` 重写、live 侧 client 播放）从原生 `/api/proxy/*` 切到 addon `/media/*`，再退役
  `src/app/api/proxy/*`。