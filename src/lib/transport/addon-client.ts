//! local-service 的 addon 聚合端点（`/addons/*`）传输层。
//!
//! 与 `apiFetch` 的区别：addon 端点不以 `/api` 为前缀，直接挂在 base URL 根下，
//! 走 Stremio 兼容的 `/manifest.json`、`/catalog/…`、`/meta/…`、`/stream/…`。

import { localServiceFetch } from '@/lib/desktop/local-service-access';

import { getApiBaseUrl } from './endpoint';

export type AddonContentType = 'movie' | 'series' | 'channel' | 'tv';

export interface AddonMeta {
  id: string;
  type: AddonContentType;
  name: string;
  poster?: string;
  description?: string;
  year?: string;
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

export interface AddonManifest {
  id: string;
  version: string;
  name: string;
  types: AddonContentType[];
  resources: string[];
}

export interface AddonCollectionEntry {
  transport_url: string;
  manifest: AddonManifest;
}

export interface AddonCollection {
  addons: AddonCollectionEntry[];
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

/** 构造 catalog 路径；`extra` 形如 `search=foo`，`skip` 为分页偏移。 */
export function buildCatalogPath(
  type: AddonContentType,
  id: string,
  extra?: string,
  skip?: number
): string {
  if (extra) {
    return `/catalog/${type}/${id}/${extra}.json`;
  }
  if (typeof skip === 'number') {
    return `/catalog/${type}/${id}/skip=${skip}.json`;
  }
  return `/catalog/${type}/${id}.json`;
}

export function buildAddonUrl(path: string): string {
  const base = getApiBaseUrl().replace(/\/+$/, '');
  return `${base}/addons${path}`;
}

async function addonFetchJson<T>(path: string): Promise<T> {
  const response = await localServiceFetch(buildAddonUrl(path), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`addon ${path} failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchAddonCollection(): Promise<AddonCollection> {
  return addonFetchJson<AddonCollection>('/manifest.json');
}

export function fetchAddonCatalog(
  type: AddonContentType,
  id: string,
  options: { extra?: string; skip?: number } = {}
): Promise<AddonCatalogResponse> {
  return addonFetchJson<AddonCatalogResponse>(
    buildCatalogPath(type, id, options.extra, options.skip)
  );
}

export function fetchAddonMeta(
  type: AddonContentType,
  id: string
): Promise<AddonMetaResponse> {
  return addonFetchJson<AddonMetaResponse>(`/meta/${type}/${id}.json`);
}

export function fetchAddonStreams(
  type: AddonContentType,
  id: string
): Promise<AddonStreamsResponse> {
  return addonFetchJson<AddonStreamsResponse>(`/stream/${type}/${id}.json`);
}