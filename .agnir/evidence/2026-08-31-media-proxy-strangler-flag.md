# 2026-08-31 媒体代理切面第一条真实接线（vod 下载侧开关）

- 接线：`src/lib/download/proxy-url.ts` 的 `buildVodProxyUrl`（vod 下载/播放重写的唯一收口）新增
  服务端开关 `USE_ADDON_MEDIA_PROXY`（缺省 off）：`true` 时 m3u8/segment/key 转链直连 standalone vod
  addon 的 `/media/vod/*`（复用 round 24 `addon-media-proxy.ts` 构造器），`false`/未设回退原生
  `/api/proxy/vod/*`。strangler 档位，切 true 即把分片流量外置到 addon。
- parity 佐证：vod addon `main.rs` 已把 `CINEHARBOR_VOD_SITES` 的 site key → ua/referer 灌入
  `ProxyParts.sources`，与原生 per-source 防盗链头一致；CORS 已开（round 21）。`serve.rs` 尚缺磁盘缓存/
  广告过滤/identity-encoding 回退等本地优化（非正确性阻塞）。
- 验证（exit 0）：新增 `proxy-url-addon-media-proxy.test.ts` 3 绿（off/tru e/非 true）；回归
  `proxy-url`/`vod-proxy`/`media-proxy` 14 绿；全仓 typecheck 0 错。
- 定位：P4 媒体代理切面的首条真实接线。剩：live 侧同理接线 → 退役 `src/app/api/proxy/*`。