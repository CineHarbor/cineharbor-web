//! 点播页 addon 直连数据源（Stremio 忠实「两步」）：搜索 = 元数据预览（无剧集流），
//! 详情 = `/meta` + `/stream` 合成（剧集流另取）。
//!
//! 与原生 `content/service.ts`（多源聚合 + 搜索即带剧集流）的差异是既定语义：搜索页先只出
//! 预览，点开详情才加载剧集（`buildDetail`）。对齐 Matt「对标 Stremio 到结尾」的口径。

import type { AddonContentType } from "@/lib/transport/addon-types";
import type {
  AddonCatalogResponse,
  AddonMetaResponse,
  AddonStreamsResponse,
} from "@/lib/transport/addon-types";
import type { SearchResult } from "@/lib/types";

import {
  metasToSearchResults,
  type CatalogBridgeOptions,
} from "./catalog-bridge";
import { buildDetail } from "./streams-bridge";

const SEARCH_ENDPOINT = "search";

const VOD_ID_PREFIX = "vod:";

/** 解析 `vod:{source}:{vid}` → `{source, vid}`；非 vod id 返回 `null`。 */
function parseVodId(id: string): { source: string; vid: string } | null {
  if (!id.startsWith(VOD_ID_PREFIX)) {
    return null;
  }
  const rest = id.slice(VOD_ID_PREFIX.length);
  const sep = rest.indexOf(":");
  if (sep <= 0) {
    return null;
  }
  return { source: rest.slice(0, sep), vid: rest.slice(sep + 1) };
}

/**
 * 把 addon 复合 id 还原为原生 `SearchResult` 形状：`id`=vid、`source`=站点 key。这样搜索结果的
 * `id/source` 与既有页面导航（`/play?source=&id=`）及原生详情 `/api/detail` 保持兼容。
 * `source_name` 先以站点 key 顶替（addon 未暴露站点展示名，缺口）。
 */
function reconcileVodResult(result: SearchResult): SearchResult {
  const parsed = parseVodId(result.id);
  if (!parsed) {
    return result;
  }
  return {
    ...result,
    id: parsed.vid,
    source: parsed.source,
    source_name: parsed.source,
  };
}

/** 依赖倒置：core 直连四桥里点播所需三端点（`CoreAddonClient` 结构上满足）。 */
export interface ContentAddonPort {
  catalog(
    type: AddonContentType,
    id: string,
    options?: { search?: string; skip?: number },
  ): Promise<AddonCatalogResponse>;
  meta(type: AddonContentType, id: string): Promise<AddonMetaResponse>;
  streams(type: AddonContentType, id: string): Promise<AddonStreamsResponse>;
}

export interface AddonContentDataSource {
  search(query: string, skip?: number): Promise<SearchResult[]>;
  detail(type: AddonContentType, id: string): Promise<SearchResult | null>;
}

export class AddonContentDataSourceImpl implements AddonContentDataSource {
  constructor(
    private readonly addon: ContentAddonPort,
    private readonly options: CatalogBridgeOptions,
  ) {}

  async search(query: string, skip = 0): Promise<SearchResult[]> {
    const [movies, series] = await Promise.all([
      this.addon.catalog("movie", SEARCH_ENDPOINT, { search: query, skip }),
      this.addon.catalog("series", SEARCH_ENDPOINT, { search: query, skip }),
    ]);
    return metasToSearchResults(
      [...movies.metas, ...series.metas],
      this.options,
    ).map(reconcileVodResult);
  }

  async detail(type: AddonContentType, id: string): Promise<SearchResult | null> {
    const [metaRes, streamsRes] = await Promise.all([
      this.addon.meta(type, id),
      this.addon.streams(type, id),
    ]);
    return reconcileVodResult(
      buildDetail(metaRes.meta, streamsRes.streams, this.options),
    );
  }
}