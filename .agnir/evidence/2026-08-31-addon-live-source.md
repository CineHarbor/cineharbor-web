# 2026-08-31 addon-live-source（live 页原生形状适配器）

- 新增 `src/lib/core/live/addon-live-source.ts`：`AddonLiveDataSourceImpl` 把 `AddonLiveClient` 适配为
  live 页原生 `LiveSource[]` / `LiveChannel[]`（native 形状不变 → 页面可零改动开关替换）。
  - `listSources()` → `{key,name,url:"",from:"config"}`（addon 不暴露上游 M3U）。
  - `listChannels(key)` → 逐个 `getStreamUrl` 填已转链 `url`（无流频道 url 空）、`tvgId` 空（EPG 缺口，页面
    `tvgId || name` 回退）、`group||"其他"`。
- 验证：jest 2 套件 6 绿（source 映射 / 频道含已转链 url + 无流置空 + group 回退）+ 全仓 typecheck 0 错。
- README（门面仓）新增「实现进度（ADR-0006，2026-08-31）」段：core 双编译 / addon 外置 / web 薄客户端底座
  三项 ✅，P4 切面 🔨；`docs/plans/README.md` stremio 行更新为 P0–P3 全落地 + 剩余。
- 下一步（页面接线，最后一次 UI 手术，建议 Matt 交互验证）：`live/page.tsx` 里 `fetchLiveSources()`/
  `fetchLiveChannels(key)` 按 `NEXT_PUBLIC_USE_ADDON_LIVE` 换成本适配器（默认 off）；EPG/precheck/logo 代理
  暂走原生 fallback 或降级，验证后退役 `/api/live/*` + `/api/proxy/m3u8|segment|key`。