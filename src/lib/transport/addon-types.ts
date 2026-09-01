//! Stremio addon 协议的基础 DTO 类型（供 shape-bridge 与直连传输层共享）。
//!
//! 原 `transport/addon-client.ts` 里「local-service `/addons/*` 聚合客户端」随 ADR-0006 已无页面
//! 消费而退役，但其**协议类型**仍被 `catalog-bridge` / `streams-bridge` / `CoreAddonClient` /
//! `AddonLiveClient` 复用，故沉淀于此。

export type AddonContentType = 'movie' | 'series' | 'channel' | 'tv';

export interface AddonMeta {
  id: string;
  type: AddonContentType;
  name: string;
  poster?: string;
  description?: string;
  year?: string;
  rating?: string;
  genres?: string[];
}

export interface AddonStream {
  name?: string;
  title?: string;
  url?: string;
  ytId?: string;
  infoHash?: string;
  fileIdx?: number;
}

export interface AddonCatalogResponse {
  metas: AddonMeta[];
}

export interface AddonStreamsResponse {
  streams: AddonStream[];
}

export interface AddonMetaResponse {
  meta: AddonMeta;
}