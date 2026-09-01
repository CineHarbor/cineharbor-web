//! Stremio addon 协议 → 页面 rich 模型的 shape-bridge（P4 数据流切换的纯映射层）。
//!
//! 语义约束：Stremio 把「元数据」与「播单」分离（`/meta` 与 `/stream`），而既有 `SearchResult`
//! 把二者合并（`episodes`/`episodes_titles` 直接携带剧集流）。因此本桥只产出**元数据骨架**
//! （`episodes` 恒为 `[]`），剧集流由后续的 streams-bridge 调用 `/stream` 后单独填充。

import type { AddonMeta } from "@/lib/transport/addon-types";
import type { SearchResult } from "@/lib/types";

export interface CatalogBridgeOptions {
  /** 内容源标识（对应 provider：`douban` / `vod` / `live`）。 */
  source: string;
  /** 展示用源名。 */
  sourceName: string;
}

export function metaToSearchResult(
  meta: AddonMeta,
  options: CatalogBridgeOptions,
): SearchResult {
  return {
    id: meta.id,
    title: meta.name,
    poster: meta.poster ?? "",
    episodes: [],
    episodes_titles: [],
    source: options.source,
    source_name: options.sourceName,
    class: meta.type,
    year: meta.year ?? "",
    desc: meta.description,
    type_name: meta.type,
  };
}

export function metasToSearchResults(
  metas: AddonMeta[],
  options: CatalogBridgeOptions,
): SearchResult[] {
  return metas.map((meta) => metaToSearchResult(meta, options));
}