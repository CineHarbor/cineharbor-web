//! live 页的 addon 直连数据源：把 standalone live addon 的 manifest/catalog/streams 映射为页面所用源/频道/播放流。
//!
//! 对齐多源 live addon（round 29）：每个直播源 = 一个 catalog（`manifest.catalogs`），频道 id
//! `live:{key}:{idx}`；`getStreamUrl` 返回已转链 url。与原生 `/api/live/*`（返回 `LiveChannel.url` 上游地址、
//! 页面再转链）的差异：addon 侧频道与流分离。tvg-id/EPG 仍为已知缺口。

import type {
  AddonCatalogResponse,
  AddonContentType,
  AddonStreamsResponse,
} from "@/lib/transport/addon-types";

export interface AddonLiveSource {
  key: string;
  name: string;
}

export interface AddonLiveChannel {
  id: string;
  name: string;
  logo: string;
  group: string;
  /** addon 尚未返回 tvg-id（native EPG 依赖；缺口）。 */
  tvgId: string;
}

/** 依赖倒置：只依赖 manifest/catalog/streams 三端点，便于纯单测（CoreAddonClient 结构上满足）。 */
export interface LiveAddonPort {
  manifest(): Promise<{
    catalogs?: Array<{ id: string; name?: string; type?: string }>;
  }>;
  catalog(
    type: AddonContentType,
    id: string,
    options?: { search?: string; skip?: number },
  ): Promise<AddonCatalogResponse>;
  streams(type: AddonContentType, id: string): Promise<AddonStreamsResponse>;
}

export class AddonLiveClient {
  constructor(private readonly addon: LiveAddonPort) {}

  async listSources(): Promise<AddonLiveSource[]> {
    const manifest = await this.addon.manifest();
    return (manifest.catalogs ?? [])
      .filter((catalog) => catalog.type === undefined || catalog.type === "tv")
      .map((catalog) => ({ key: catalog.id, name: catalog.name ?? catalog.id }));
  }

  async listChannels(sourceKey: string): Promise<AddonLiveChannel[]> {
    const response = await this.addon.catalog("tv", sourceKey);
    return response.metas.map((meta) => ({
      id: meta.id,
      name: meta.name,
      logo: meta.poster ?? "",
      group: meta.description ?? "",
      tvgId: "",
    }));
  }

  async getStreamUrl(channelId: string): Promise<string> {
    const response = await this.addon.streams("tv", channelId);
    const url = response.streams[0]?.url;
    if (!url) {
      throw new Error(`live 频道 ${channelId} 无播放流`);
    }
    return url;
  }
}