import {
  getAddonContentDataSource,
} from '@/lib/core/content/addon-content-data-source-factory';
import {
  buildSuggestions,
  type ContentSuggestion,
} from '@/lib/core/content/suggestions';
import { getRuntimeConfig } from '@/lib/runtime-config';
import type { ApiFetchOptions } from '@/lib/transport/api-client';
import { SearchResult } from '@/lib/types';
import { filterAdultContentResults } from '@/lib/yellow';

export type { ContentSuggestion };

type ContentRequestOptions = Omit<ApiFetchOptions, 'searchParams'>;

export async function fetchContentDetail(
  params: {
    source: string;
    id: string;
  },
  _options: ContentRequestOptions = {}
): Promise<SearchResult> {
  // 点播详情已退役原生 /api/detail：统一走 addon 直连（Stremio 两步的 meta+stream 合成）。
  // 调用方均为浏览器侧组件（play/下载/追更/播放源），无服务端消费。
  const addonId = params.id.startsWith("vod:")
    ? params.id
    : `vod:${params.source}:${params.id}`;
  const result = await getAddonContentDataSource().detail("movie", addonId);
  if (!result) {
    throw new Error("获取视频详情失败");
  }
  return result;
}

export async function fetchContentSearchResults(
  query: string,
  options: ContentRequestOptions & {
    allowAdultResults?: boolean;
  } = {}
): Promise<SearchResult[]> {
  const { allowAdultResults } = options;
  const results = await getAddonContentDataSource().search(query);
  const disableFilter = getRuntimeConfig().DISABLE_YELLOW_FILTER === true;
  if (allowAdultResults || disableFilter) {
    return results;
  }
  return filterAdultContentResults(results);
}

export async function fetchContentSuggestions(
  query: string,
  options: ContentRequestOptions = {}
): Promise<ContentSuggestion[]> {
  const results = await fetchContentSearchResults(query, options);
  return buildSuggestions(query, results);
}
