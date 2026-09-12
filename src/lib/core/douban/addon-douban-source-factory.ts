//! 豆瓣标题搜索 addon 直连的懒加载构造（切面开关 `NEXT_PUBLIC_USE_ADDON_DOUBAN`，默认 on）。
//!
//! 与 live/vod factory 同型：首次调用才 `loadCoreBridge()`。流量：
//! `AddonDoubanClient` → `CoreAddonClient`（douban base）→ worker RPC → douban addon HTTP。

import { loadCoreBridge } from "@/lib/core/bridge";
import {
  CoreAddonClient,
  getAddonProviderConfig,
} from "@/lib/transport/core-addon-client";

import { AddonDoubanClient } from "./addon-douban-client";

export const USE_ADDON_DOUBAN =
  process.env.NEXT_PUBLIC_USE_ADDON_DOUBAN !== "false";

let cached: AddonDoubanClient | null = null;

/** 同步返回；首次调用才 `loadCoreBridge()`，此后复用单例。 */
export function getAddonDoubanClient(): AddonDoubanClient {
  if (!cached) {
    const bridge = loadCoreBridge();
    const base = getAddonProviderConfig().douban;
    cached = new AddonDoubanClient(new CoreAddonClient(bridge, base));
  }
  return cached;
}
