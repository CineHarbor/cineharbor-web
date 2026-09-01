import { apiFetch } from './api-client';
import { buildLiveLogoProxyUrl } from './media-proxy';

export interface LiveSource {
  key: string;
  name: string;
  url: string;
  ua?: string;
  epg?: string;
  from: 'config' | 'custom';
  channelNumber?: number;
  disabled?: boolean;
}

export interface LiveChannel {
  id: string;
  tvgId: string;
  name: string;
  logo: string;
  group: string;
  url: string;
}

export interface LiveEpgData {
  tvgId: string;
  source: string;
  epgUrl: string;
  programs: Array<{
    start: string;
    end: string;
    title: string;
  }>;
}

async function parseJsonResponse<T>(
  response: Response,
  fallbackMessage: string
): Promise<T> {
  if (!response.ok) {
    throw new Error(fallbackMessage);
  }

  return (await response.json()) as T;
}

export function buildLiveLogoUrl(
  logoUrl: string,
  sourceKey?: string | null
): string {
  return buildLiveLogoProxyUrl({
    url: logoUrl,
    sourceKey,
  });
}

// EPG 在 addon 直连模式下退化为空（tvgId 恒空，见 addon-live-source）；此处保留原生 /live/epg
// 客户端仅为历史迁移回退，实跑不再命中（guard `channel.tvgId` 恒 false）。
export async function fetchLiveEpg(
  sourceKey: string,
  tvgId: string
): Promise<LiveEpgData> {
  const result = await parseJsonResponse<{
    success?: boolean;
    error?: string;
    data?: LiveEpgData;
  }>(
    await apiFetch('/live/epg', {
      searchParams: {
        source: sourceKey,
        tvgId,
      },
    }),
    '获取节目单信息失败'
  );

  if (!result.success || !result.data) {
    throw new Error(result.error || '获取节目单信息失败');
  }

  return result.data;
}