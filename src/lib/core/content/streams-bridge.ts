//! Stremio `/stream` → 页面 rich 模型的剧集流 shape-bridge（P4 点播数据流切换的纯映射层）。
//!
//! 与 `catalog-bridge`（只产元数据骨架，`episodes` 恒空）成对：点播详情两步走 ——
//! 先 catalog/meta 取骨架，再 `/stream/{ty}/{id}` 取剧集流，用 `buildDetail` 合成完整
//! `SearchResult`（`episodes` = 各集已转链 m3u8，`episodes_titles` = 集名）。

import type { AddonMeta, AddonStream } from "@/lib/transport/addon-types";
import type { SearchResult } from "@/lib/types";

import { metaToSearchResult, type CatalogBridgeOptions } from "./catalog-bridge";

export interface EpisodeStreams {
  episodes: string[];
  episodes_titles: string[];
}

/** `/stream` 结果 → `episodes`（url，无 url 的流如纯 infoHash 跳过）+ `episodes_titles`。 */
export function streamsToEpisodes(streams: AddonStream[]): EpisodeStreams {
  const episodes: string[] = [];
  const episodes_titles: string[] = [];
  streams.forEach((stream, index) => {
    if (!stream.url) {
      return;
    }
    episodes.push(stream.url);
    episodes_titles.push(stream.title || stream.name || `第${index + 1}集`);
  });
  return { episodes, episodes_titles };
}

/** 详情两步合成的最终结果：catalog-bridge 元数据骨架 + streams-bridge 剧集流。 */
export function buildDetail(
  meta: AddonMeta,
  streams: AddonStream[],
  options: CatalogBridgeOptions,
): SearchResult {
  const { episodes, episodes_titles } = streamsToEpisodes(streams);
  return { ...metaToSearchResult(meta, options), episodes, episodes_titles };
}