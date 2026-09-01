import { apiFetch, ApiFetchOptions } from '@/lib/transport/api-client';
import { buildApiUrl } from '@/lib/transport/endpoint';
import { SearchResult } from '@/lib/types';
// addon 直连工厂（模块加载不触碰浏览器 API；worker 仅在调用 site 且浏览器侧才 spawn）。
import {
  getAddonContentDataSource,
} from '@/lib/core/content/addon-content-data-source-factory';

export interface ContentSuggestion {
  text: string;
  type: 'exact' | 'related' | 'suggestion';
  score: number;
}

interface ContentSearchResponse {
  results?: SearchResult[];
  error?: string;
}

interface ContentSuggestionsResponse {
  suggestions?: ContentSuggestion[];
  error?: string;
}

type ContentRequestOptions = Omit<ApiFetchOptions, 'searchParams'>;

async function parseJsonResponse<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

function resolveContentErrorMessage(
  response: Response,
  payload: { error?: string } | null | undefined,
  fallbackMessage: string
): string {
  if (payload?.error?.trim()) {
    return payload.error;
  }

  if (!response.ok) {
    return fallbackMessage;
  }

  return '';
}

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
  const { allowAdultResults, ...requestOptions } = options;
  const response = await apiFetch('/search', {
    ...requestOptions,
    searchParams: {
      q: query,
      adult: allowAdultResults ? '1' : undefined,
    },
  });
  const payload = await parseJsonResponse<ContentSearchResponse>(response);

  const errorMessage = resolveContentErrorMessage(
    response,
    payload,
    '获取搜索结果失败'
  );
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return Array.isArray(payload.results) ? payload.results : [];
}

export async function fetchContentSuggestions(
  query: string,
  options: ContentRequestOptions = {}
): Promise<ContentSuggestion[]> {
  const response = await apiFetch('/search/suggestions', {
    ...options,
    searchParams: {
      q: query,
    },
  });
  const payload = await parseJsonResponse<ContentSuggestionsResponse>(response);

  const errorMessage = resolveContentErrorMessage(
    response,
    payload,
    '获取搜索建议失败'
  );
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  return Array.isArray(payload.suggestions) ? payload.suggestions : [];
}

export function buildContentSearchStreamUrl(query: string): string {
  return buildApiUrl('/search/ws', {
    q: query,
  });
}
