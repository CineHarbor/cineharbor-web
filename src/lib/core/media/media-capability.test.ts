import {
  normalizeVodEpisodeUrl,
  normalizeVodEpisodeUrlForDownload,
} from '@/lib/download/normalize';
import { isVodProxyUrl, looksLikeManifestUrl } from '@/lib/download/proxy-url';

import {
  getAddonMediaResource,
  mediaCapabilityRefreshDelay,
  needsMediaCapabilityRefresh,
  refreshMediaCandidates,
} from './media-capability';

const NOW = 1_800_000_000_000;
const signed = (expires = NOW / 1000 + 3600, path = '/prefix/media/vod/m3u8') =>
  `https://addon.test${path}?source=demo&url=https%3A%2F%2Fcdn.test%2Fa%3Fsig%3Dnested%252F%26token%3Dprivate&sig=${'a'.repeat(
    43
  )}&expires=${expires}`;

describe('opaque addon media capabilities', () => {
  it.each(['m3u8', 'segment', 'key'])(
    'preserves signed %s URL bytes in playback and downloads',
    (kind) => {
      const url = signed(undefined, `/tenant/a/media/vod/${kind}`);
      expect(normalizeVodEpisodeUrl('other', url)).toBe(url);
      expect(normalizeVodEpisodeUrlForDownload('other', url)).toBe(url);
      expect(isVodProxyUrl(url)).toBe(true);
      expect(looksLikeManifestUrl(url)).toBe(kind === 'm3u8');
      expect(getAddonMediaResource(url)?.kind).toBe(kind);
    }
  );
  it.each([
    'https://cdn.test/direct.m3u8?sig=a%2fb',
    'blob:https://app.test/offline',
    '/downloads/offline.m3u8',
    '',
  ])('does not proxy a direct or offline resource: %s', (url) => {
    expect(normalizeVodEpisodeUrl('source', url)).toBe(url);
    expect(needsMediaCapabilityRefresh(url, NOW)).toBe(false);
  });
  it.each([
    '/media/vod/m3u8evil',
    '/media/vod/segment/extra',
    '/media/vod',
    '/unrelated',
  ])('matches exact resource endpoints, not %s', (path) => {
    expect(getAddonMediaResource(`https://addon.test${path}`)).toBeNull();
    expect(isVodProxyUrl(`https://addon.test${path}`)).toBe(false);
  });
  it('refreshes one minute before expiry without changing the original URL', () => {
    expect(mediaCapabilityRefreshDelay(signed(), NOW)).toBe(3_540_000);
    expect(needsMediaCapabilityRefresh(signed(NOW / 1000 + 60), NOW)).toBe(
      true
    );
    expect(needsMediaCapabilityRefresh(signed(NOW / 1000 - 1), NOW)).toBe(true);
  });
  it.each(['', 'abc', '-1', 'Infinity', '9007199254740991'])(
    'fails closed for invalid expiry %s',
    (expiry) => {
      const url = new URL(signed());
      url.searchParams.set('expires', expiry);
      expect(needsMediaCapabilityRefresh(url.href, NOW)).toBe(true);
    }
  );
  it.each(['source', 'url', 'sig', 'expires'])(
    'rejects missing or duplicate %s fields for renewal',
    (key) => {
      const url = new URL(signed());
      url.searchParams.delete(key);
      expect(needsMediaCapabilityRefresh(url.href, NOW)).toBe(true);
      url.href = signed();
      url.searchParams.append(key, url.searchParams.get(key) || '');
      expect(needsMediaCapabilityRefresh(url.href, NOW)).toBe(true);
    }
  );
  it('supports prefixed Live capabilities without rewriting source or CORS parameters', () => {
    const url = signed(undefined, '/tenant/media/live/key').replace(
      'source=demo',
      'cineharbor-source=demo'
    );
    expect(getAddonMediaResource(url)?.provider).toBe('live');
    expect(needsMediaCapabilityRefresh(url, NOW)).toBe(false);
  });
  it('does not read browser signing secrets', () => {
    process.env.NEXT_PUBLIC_MEDIA_PROXY_TOKEN = 'must-not-be-appended';
    try {
      expect(normalizeVodEpisodeUrl('demo', signed())).toBe(signed());
    } finally {
      delete process.env.NEXT_PUBLIC_MEDIA_PROXY_TOKEN;
    }
  });
  it('refreshes stale queued resources through one metadata call', async () => {
    const fresh = signed(Date.now() / 1000 + 3600).replace(
      /expires=([0-9]+)\.[0-9]+/,
      'expires=$1'
    );
    const reload = jest.fn().mockResolvedValue([fresh]);
    expect(
      await refreshMediaCandidates(
        [signed(1), 'https://cdn.test/direct.m3u8'],
        reload
      )
    ).toEqual([fresh, 'https://cdn.test/direct.m3u8']);
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('never falls back to stale capabilities when metadata renewal fails', async () => {
    await expect(
      refreshMediaCandidates([signed(1)], async () => [signed(2)])
    ).rejects.toThrow('媒体授权刷新失败');
    await expect(
      refreshMediaCandidates([signed(1)], async () => [])
    ).rejects.toThrow('媒体授权刷新失败');
  });
});
