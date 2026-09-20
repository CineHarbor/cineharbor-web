//! addon 媒体代理直连 URL 构造（对齐 Rust `cineharbor-media` 的 `build_vod/live_proxy_*_url`）。
//!
//! 终态：浏览器/下载侧不再走 web 原生 `/api/proxy/*`，改直连 standalone vod/live addon 的
//! `/media/{vod,live}/{m3u8,segment,key}`（跨源 fetch；SDK `router()` 与 `serve.rs` CORS 已开）。
//! 契约与 Rust 逐项对齐：vod 用 `source`/`url`；live 用 `cineharbor-source`/`url` + 可选 `allowCORS=true`。
//! 用 `URLSearchParams` 因它与 Rust `url::form_urlencoded` 编码一致（`:`→`%3A`、`/`→`%2F`、空格→`+`）。

import { getAddonProviderConfig } from "@/lib/transport/core-addon-client";

const VOD_PATHS = {
  m3u8: "/media/vod/m3u8",
  segment: "/media/vod/segment",
  key: "/media/vod/key",
} as const;

const LIVE_PATHS = {
  m3u8: "/media/live/m3u8",
  segment: "/media/live/segment",
  key: "/media/live/key",
} as const;

export type MediaProxyProvider = "vod" | "live";

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function buildProxyUrl(
  baseUrl: string,
  path: string,
  params: URLSearchParams
): string {
  return `${normalizeBaseUrl(baseUrl)}${path}?${params.toString()}`;
}

/** vod / live addon 的媒体代理 base（由 provider 配置注入，终态直连目标）。 */
export function getAddonMediaProxyBaseUrl(provider: MediaProxyProvider): string {
  return normalizeBaseUrl(getAddonProviderConfig()[provider]);
}

// —— vod：`?source=<source>&url=<url>` ——

export function buildVodAddonProxyM3u8Url(
  baseUrl: string,
  source: string,
  url: string
): string {
  const params = new URLSearchParams();
  params.set("source", source);
  params.set("url", url);
  return buildProxyUrl(baseUrl, VOD_PATHS.m3u8, params);
}

export function buildVodAddonProxySegmentUrl(
  baseUrl: string,
  source: string,
  url: string
): string {
  const params = new URLSearchParams();
  params.set("source", source);
  params.set("url", url);
  return buildProxyUrl(baseUrl, VOD_PATHS.segment, params);
}

export function buildVodAddonProxyKeyUrl(
  baseUrl: string,
  source: string,
  url: string
): string {
  const params = new URLSearchParams();
  params.set("source", source);
  params.set("url", url);
  return buildProxyUrl(baseUrl, VOD_PATHS.key, params);
}

// —— live：`?cineharbor-source=<key>&url=<url>[&allowCORS=true]` ——

export function buildLiveAddonProxyM3u8Url(
  baseUrl: string,
  sourceKey: string,
  url: string,
  allowCors = false
): string {
  const params = new URLSearchParams();
  params.set("cineharbor-source", sourceKey);
  params.set("url", url);
  if (allowCors) {
    params.set("allowCORS", "true");
  }
  return buildProxyUrl(baseUrl, LIVE_PATHS.m3u8, params);
}

export function buildLiveAddonProxySegmentUrl(
  baseUrl: string,
  sourceKey: string,
  url: string
): string {
  const params = new URLSearchParams();
  params.set("cineharbor-source", sourceKey);
  params.set("url", url);
  return buildProxyUrl(baseUrl, LIVE_PATHS.segment, params);
}

export function buildLiveAddonProxyKeyUrl(
  baseUrl: string,
  sourceKey: string,
  url: string
): string {
  const params = new URLSearchParams();
  params.set("cineharbor-source", sourceKey);
  params.set("url", url);
  return buildProxyUrl(baseUrl, LIVE_PATHS.key, params);
}