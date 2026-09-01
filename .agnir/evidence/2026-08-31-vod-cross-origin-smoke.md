# 2026-08-31 点播跨源浏览器端到端（vod cutover 集成验证）

- 新增 `scripts/vod-cross-origin-smoke.mjs`（与 live smoke 同构）：headless Chrome 里从 A 源页面直连
  B 源真实 vod addon :11473，经 worker→wasm→fetch 对 mock CustomAPI 站完成 catalog(search)/meta/streams。
- 结果 `VOD_CROSS_ORIGIN_RESULT`：catalogCount=2（“星际”→电影 101 + 连续剧 202）、meta 视频数 1、
  streamCount 1、streamUrl 为转链后的 `/media/vod/m3u8?source=mock&url=…`——证明点播「搜索→详情→剧集流」
  + 媒体代理转链在浏览器跨源下全通。
- 踩坑修复：`CINEHARBOR_VOD_SITES` 是 **JSON 文件路径**（main.rs `read_to_string`），非内联 JSON——
  smoke 改为写临时配置文件再指路径（脚本内注释固化该约定）。
- 至此 live（addon-cross-origin-smoke）+ vod（vod-cross-origin-smoke）两条真实 cross-origin 浏览器
  端到端均已通过，覆盖「addon HTTP 直连」双切面。