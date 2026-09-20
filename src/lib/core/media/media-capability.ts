/** Capability URLs are opaque server-issued resources, never client-generated URLs. */
export type AddonMediaResource = {
  provider: 'vod' | 'live';
  kind: 'm3u8' | 'segment' | 'key';
  url: URL;
};

const RENEWAL_MARGIN_MS = 60_000;

export function getAddonMediaResource(
  value: string
): AddonMediaResource | null {
  try {
    const url = new URL(value, 'https://cineharbor.invalid');
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    const match = url.pathname.match(
      /\/media\/(vod|live)\/(m3u8|segment|key)$/
    );
    if (!match) return null;
    return {
      provider: match[1] as AddonMediaResource['provider'],
      kind: match[2] as AddonMediaResource['kind'],
      url,
    };
  } catch {
    return null;
  }
}

/** Parsing supports refresh decisions only. Signature verification belongs to the server. */
export function mediaCapabilityRefreshDelay(
  value: string,
  now = Date.now()
): number | null {
  const resource = getAddonMediaResource(value);
  if (!resource) return null;
  const params = resource.url.searchParams;
  const sourceKey =
    resource.provider === 'vod' ? 'source' : 'cineharbor-source';
  if (
    [sourceKey, 'url', 'sig', 'expires'].some(
      (key) => params.getAll(key).length !== 1 || !params.get(key)
    )
  )
    return 0;
  const expiryText = params.get('expires') || '';
  const signature = params.get('sig') || '';
  if (!/^\d+$/.test(expiryText) || !/^[A-Za-z0-9_-]{43}$/.test(signature))
    return 0;
  const expiry = Number(expiryText) * 1000;
  if (!Number.isSafeInteger(expiry) || !Number.isFinite(now)) return 0;
  return Math.max(0, Math.min(expiry - now - RENEWAL_MARGIN_MS, 2_147_483_647));
}

export function needsMediaCapabilityRefresh(
  value: string,
  now = Date.now()
): boolean {
  return mediaCapabilityRefreshDelay(value, now) === 0;
}

/** Refresh stale queued requests through addon metadata, not an arbitrary-URL signing API. */
export async function refreshMediaCandidates(
  candidates: string[],
  reload: () => Promise<string[]>
): Promise<string[]> {
  if (!candidates.some((url) => needsMediaCapabilityRefresh(url)))
    return candidates;
  let fresh: string[];
  try {
    fresh = await reload();
  } catch {
    throw new Error('媒体授权刷新失败，请重新加载内容后重试');
  }
  if (
    !fresh.length ||
    fresh.some((url) => !url || needsMediaCapabilityRefresh(url))
  ) {
    throw new Error('媒体授权刷新失败，请重新加载内容后重试');
  }
  return Array.from(
    new Set([
      ...fresh,
      ...candidates.filter((url) => !needsMediaCapabilityRefresh(url)),
    ])
  );
}
