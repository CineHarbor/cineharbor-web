//! 番剧日历 addon 直连的懒加载构造（切面开关 `NEXT_PUBLIC_USE_ADDON_BANGUMI`，默认 on）。

import { loadCoreBridge } from "@/lib/core/bridge";
import {
  CoreAddonClient,
  getAddonProviderConfig,
} from "@/lib/transport/core-addon-client";

import { AddonBangumiClient } from "./addon-bangumi-client";

export const USE_ADDON_BANGUMI =
  process.env.NEXT_PUBLIC_USE_ADDON_BANGUMI !== "false";

let cached: AddonBangumiClient | null = null;

export function getAddonBangumiClient(): AddonBangumiClient {
  if (!cached) {
    const bridge = loadCoreBridge();
    const base = getAddonProviderConfig().bangumi;
    cached = new AddonBangumiClient(new CoreAddonClient(bridge, base));
  }
  return cached;
}
