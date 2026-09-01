//! 点播 addon 直连数据源的懒加载构造（切面开关 `NEXT_PUBLIC_USE_ADDON_VOD`，默认 on，`=false` 才回退）。
//!
//! 与 live 的 `addon-live-source-factory.ts` 同型：首次调用才 `loadCoreBridge()`（spawn worker），
//! 之后复用单例。流量方向：`AddonContentDataSourceImpl` → `CoreAddonClient`（vod base）→ worker RPC
//! → vod addon HTTP（Stremio 两步：搜索预览 / 详情 meta+stream）。

import { loadCoreBridge } from "@/lib/core/bridge";
import {
  CoreAddonClient,
  getAddonProviderConfig,
} from "@/lib/transport/core-addon-client";

import {
  AddonContentDataSource,
  AddonContentDataSourceImpl,
} from "./addon-content-data-source";

export const USE_ADDON_VOD =
  process.env.NEXT_PUBLIC_USE_ADDON_VOD !== "false";

const OPTIONS = { source: "vod", sourceName: "点播" };

let cached: AddonContentDataSource | null = null;

/** 同步返回；首次调用才 `loadCoreBridge()`，此后复用单例。 */
export function getAddonContentDataSource(): AddonContentDataSource {
  if (!cached) {
    const bridge = loadCoreBridge();
    const base = getAddonProviderConfig().vod;
    cached = new AddonContentDataSourceImpl(
      new CoreAddonClient(bridge, base),
      OPTIONS,
    );
  }
  return cached;
}