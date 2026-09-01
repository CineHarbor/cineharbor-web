//! live 页 addon 直连数据源的懒加载构造（切面开关 `NEXT_PUBLIC_USE_ADDON_LIVE`，默认 on，`=false` 才回退）。
//!
//! 仅当 `USE_ADDON_LIVE` 为真时才 `loadCoreBridge()`（此时才在浏览器 spawn 承载 WASM core 的模块
//! Worker）；否则本模块被 import 但不会触发 worker，零回归。addon 直连的流量方向：
//! `AddonLiveDataSourceImpl` → `AddonLiveClient` → `CoreAddonClient` → worker RPC → live addon HTTP。

import { loadCoreBridge } from "@/lib/core/bridge";
import {
  CoreAddonClient,
  getAddonProviderConfig,
} from "@/lib/transport/core-addon-client";

import { AddonLiveClient } from "./addon-live-client";
import {
  AddonLiveDataSource,
  AddonLiveDataSourceImpl,
} from "./addon-live-source";

export const USE_ADDON_LIVE =
  process.env.NEXT_PUBLIC_USE_ADDON_LIVE !== "false";

let cached: AddonLiveDataSource | null = null;

/** 同步返回；首次调用才 `loadCoreBridge()`（spawn worker + 四桥），此后复用单例。 */
export function getAddonLiveDataSource(): AddonLiveDataSource {
  if (!cached) {
    const bridge = loadCoreBridge();
    const base = getAddonProviderConfig().live;
    cached = new AddonLiveDataSourceImpl(
      new AddonLiveClient(new CoreAddonClient(bridge, base)),
    );
  }
  return cached;
}