import {
  buildVodAddonProxyKeyUrl,
  buildVodAddonProxyM3u8Url,
  buildVodAddonProxySegmentUrl,
  getAddonMediaProxyBaseUrl,
} from '@/lib/core/media/addon-media-proxy';
import {
  buildVodProxyKeyMediaUrl,
  buildVodProxyM3u8MediaUrl,
  buildVodProxySegmentMediaUrl,
  getVodProxyBasePath as getTransportVodProxyBasePath,
  VOD_PROXY_PATHS,
} from '@/lib/transport/media-proxy';

const VOD_PROXY_BASE_PATH = getTransportVodProxyBasePath();
const VOD_PROXY_M3U8_PATH = VOD_PROXY_PATHS.m3u8;

export type VodProxyAssetKind = 'm3u8' | 'segment' | 'key';

// 媒体代理切面开关（strangler，缺省 off）：true 时 vod 媒体代理直连 standalone addon 的
// `/media/vod/*`，把播单/分片/密钥转链外置到 addon，逐步退役原生 `/api/proxy/vod/*`。
// 服务端专用（非 NEXT_PUBLIC）。addon 的 per-source UA/Referer 与原生一致（`ProxyParts.sources`）。
function useAddonMediaProxy(): boolean {
  return process.env.USE_ADDON_MEDIA_PROXY === 'true';
}

function buildVodProxyUrl(
  kind: VodProxyAssetKind,
  source: string,
  url: string
): string {
  if (useAddonMediaProxy()) {
    const base = getAddonMediaProxyBaseUrl('vod');
    switch (kind) {
      case 'm3u8':
        return buildVodAddonProxyM3u8Url(base, source, url);
      case 'segment':
        return buildVodAddonProxySegmentUrl(base, source, url);
      case 'key':
        return buildVodAddonProxyKeyUrl(base, source, url);
      default:
        return buildVodAddonProxyM3u8Url(base, source, url);
    }
  }

  switch (kind) {
    case 'm3u8':
      return buildVodProxyM3u8MediaUrl({
        source,
        url,
      });
    case 'segment':
      return buildVodProxySegmentMediaUrl({
        source,
        url,
      });
    case 'key':
      return buildVodProxyKeyMediaUrl({
        source,
        url,
      });
    default:
      return buildVodProxyM3u8MediaUrl({
        source,
        url,
      });
  }
}

export function buildVodProxyM3u8Url(params: {
  source: string;
  url: string;
}): string {
  return buildVodProxyUrl('m3u8', params.source, params.url);
}

export function buildVodProxySegmentUrl(params: {
  source: string;
  url: string;
}): string {
  return buildVodProxyUrl('segment', params.source, params.url);
}

export function buildVodProxyKeyUrl(params: {
  source: string;
  url: string;
}): string {
  return buildVodProxyUrl('key', params.source, params.url);
}

export function buildDownloadVodProxyM3u8Url(params: {
  source: string;
  url: string;
}): string {
  return buildVodProxyM3u8Url(params);
}

export function normalizeVodProxyUrlForDesktopDownload(url: string): string {
  return url;
}

export function isAbsoluteHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function isVodProxyUrl(url: string): boolean {
  try {
    if (url.startsWith(VOD_PROXY_BASE_PATH)) {
      return true;
    }

    const parsedUrl = new URL(url, 'https://cineharbor.local');
    return parsedUrl.pathname.startsWith(VOD_PROXY_BASE_PATH);
  } catch (error) {
    return false;
  }
}

export function looksLikeManifestUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url, 'https://cineharbor.local');
    return (
      parsedUrl.pathname.startsWith(VOD_PROXY_M3U8_PATH) ||
      /\.m3u8($|[?#])/i.test(parsedUrl.pathname + parsedUrl.search)
    );
  } catch (error) {
    return url.includes(VOD_PROXY_M3U8_PATH) || /\.m3u8($|[?#])/i.test(url);
  }
}

export function getVodProxyAssetKind(url: string): VodProxyAssetKind {
  return looksLikeManifestUrl(url) ? 'm3u8' : 'segment';
}

export function getVodProxyBasePath(): string {
  return VOD_PROXY_BASE_PATH;
}
