import {
  buildVodAddonProxyKeyUrl,
  buildVodAddonProxyM3u8Url,
  buildVodAddonProxySegmentUrl,
  getAddonMediaProxyBaseUrl,
} from '@/lib/core/media/addon-media-proxy';
import {
  getVodProxyBasePath as getTransportVodProxyBasePath,
  VOD_PROXY_PATHS,
} from '@/lib/transport/media-proxy';

const VOD_PROXY_BASE_PATH = getTransportVodProxyBasePath();
const VOD_PROXY_M3U8_PATH = VOD_PROXY_PATHS.m3u8;
const ADDON_VOD_PROXY_M3U8_PATH = '/media/vod/m3u8';

export type VodProxyAssetKind = 'm3u8' | 'segment' | 'key';

function buildVodProxyUrl(
  kind: VodProxyAssetKind,
  source: string,
  url: string
): string {
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

function isVodProxyPath(pathname: string): boolean {
  return /\/(?:api\/proxy|media)\/vod\/(?:m3u8|segment|key)$/.test(pathname);
}

export function isVodProxyUrl(url: string): boolean {
  try {
    if (isVodProxyPath(url)) {
      return true;
    }

    const parsedUrl = new URL(url, 'https://cineharbor.local');
    return isVodProxyPath(parsedUrl.pathname);
  } catch (error) {
    return false;
  }
}

export function looksLikeManifestUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url, 'https://cineharbor.local');
    return (
      /\/(?:api\/proxy|media)\/vod\/m3u8$/.test(parsedUrl.pathname) ||
      /\.m3u8($|[?#])/i.test(parsedUrl.pathname + parsedUrl.search)
    );
  } catch (error) {
    return (
      url.includes(VOD_PROXY_M3U8_PATH) ||
      url.includes(ADDON_VOD_PROXY_M3U8_PATH) ||
      /\.m3u8($|[?#])/i.test(url)
    );
  }
}

export function getVodProxyAssetKind(url: string): VodProxyAssetKind {
  return looksLikeManifestUrl(url) ? 'm3u8' : 'segment';
}

export function getVodProxyBasePath(): string {
  return VOD_PROXY_BASE_PATH;
}
