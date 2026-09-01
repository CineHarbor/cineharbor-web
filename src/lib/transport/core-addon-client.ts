//! 薄客户端直连链路：WASM core（worker 桥）直连 standalone addon，替代 local-service `/addons/*`。
//!
//! 三通路：douban / live / vod 三个 standalone addon；base URL 由 `getAddonProviderConfig`
//! 注入（`NEXT_PUBLIC_{DOUBAN,VOD,LIVE}_ADDON_URL` 可覆盖）。页面侧后续按数据流改用此类。

import type { CoreBridge } from "@/lib/core/bridge";
import type {
  AddonCatalogResponse,
  AddonContentType,
  AddonMetaResponse,
  AddonStreamsResponse,
} from "./addon-types";

export interface CoreCatalogEntry {
  type: string;
  id: string;
  name?: string;
  extra?: string[];
}

export interface CoreManifest {
  id: string;
  version: string;
  name: string;
  description?: string;
  types: string[];
  resources: string[];
  catalogs?: CoreCatalogEntry[];
  idPrefixes?: string[];
}

export interface AddonProviderConfig {
  douban: string;
  vod: string;
  live: string;
}

export function getAddonProviderConfig(): AddonProviderConfig {
  return {
    douban: process.env.NEXT_PUBLIC_DOUBAN_ADDON_URL ?? "http://127.0.0.1:11471",
    vod: process.env.NEXT_PUBLIC_VOD_ADDON_URL ?? "http://127.0.0.1:11473",
    live: process.env.NEXT_PUBLIC_LIVE_ADDON_URL ?? "http://127.0.0.1:11472",
  };
}

function parseJson<T>(op: string, baseUrl: string, raw: string): T {
  if (raw.trim() === "") {
    throw new Error(`${op} ${baseUrl} 返回空响应`);
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(
      `${op} ${baseUrl} 返回非法 JSON：${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export class CoreAddonClient {
  constructor(
    private readonly bridge: CoreBridge,
    private readonly baseUrl: string,
  ) {}

  manifest(): Promise<CoreManifest> {
    return this.bridge
      .addonManifestJson(this.baseUrl)
      .then((raw) => parseJson<CoreManifest>("manifest", this.baseUrl, raw));
  }

  catalog(
    type: AddonContentType,
    id: string,
    options: { search?: string; skip?: number } = {},
  ): Promise<AddonCatalogResponse> {
    return this.bridge
      .addonCatalogJson(this.baseUrl, type, id, options)
      .then((raw) =>
        parseJson<AddonCatalogResponse>("catalog", this.baseUrl, raw),
      );
  }

  meta(type: AddonContentType, id: string): Promise<AddonMetaResponse> {
    return this.bridge
      .addonMetaJson(this.baseUrl, type, id)
      .then((raw) => parseJson<AddonMetaResponse>("meta", this.baseUrl, raw));
  }

  streams(type: AddonContentType, id: string): Promise<AddonStreamsResponse> {
    return this.bridge
      .addonStreamsJson(this.baseUrl, type, id)
      .then((raw) =>
        parseJson<AddonStreamsResponse>("streams", this.baseUrl, raw),
      );
  }
}