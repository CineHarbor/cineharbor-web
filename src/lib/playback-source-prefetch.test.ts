import { getAddonContentDataSource } from '@/lib/core/content/addon-content-data-source-factory';
import { getRuntimeConfig } from '@/lib/runtime-config';
import { SearchResult } from '@/lib/types';

jest.mock('@/lib/runtime-config', () => ({
  getRuntimeConfig: jest.fn(),
}));

jest.mock('@/lib/core/content/addon-content-data-source-factory', () => ({
  getAddonContentDataSource: jest.fn(),
}));

import {
  buildPlaybackSearchQueries,
  filterPlaybackSearchResults,
  searchPlaybackSources,
} from './playback-source-prefetch';

function buildSearchResult(partial: Partial<SearchResult>): SearchResult {
  return {
    id: partial.id || 'vod-id',
    title: partial.title || '租借女友第5季',
    poster: partial.poster || '',
    episodes: partial.episodes || ['https://example.com/index.m3u8'],
    episodes_titles: partial.episodes_titles || ['第1集'],
    source: partial.source || 'demo',
    source_name: partial.source_name || '演示源',
    year: partial.year || '2026',
    desc: partial.desc,
    type_name: partial.type_name,
    douban_id: partial.douban_id,
  };
}

const getDataSourceMock = getAddonContentDataSource as unknown as jest.Mock;

describe('playback source prefetch helpers', () => {
  beforeEach(() => {
    (getRuntimeConfig as jest.Mock).mockReturnValue({
      APP_TARGET: 'web',
    });
    getDataSourceMock.mockReset();
  });

  it('prioritizes exact douban id matches over title formatting differences', () => {
    const matched = buildSearchResult({
      id: 'matched',
      title: '租借女友第5季',
      year: '2026',
      douban_id: 129836,
      source: 'matched-source',
    });
    const similar = buildSearchResult({
      id: 'similar',
      title: '租借女友 第五季 特别篇',
      year: '2026',
      douban_id: 888888,
      source: 'similar-source',
    });

    const results = filterPlaybackSearchResults([similar, matched], {
      title: '租借女友 第五季',
      year: '2026',
      searchType: 'tv',
      doubanId: 129836,
    });

    expect(results.map((result) => result.id)).toEqual(['matched']);
  });

  it('drops preview-only exact matches when full episodes exist', () => {
    const fullSeries = buildSearchResult({
      id: 'series',
      title: '雨霖铃',
      year: '2026',
      douban_id: 36310054,
      source: 'series-source',
      episodes: [
        'https://example.com/episode-1/index.m3u8',
        'https://example.com/episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });
    const trailer = buildSearchResult({
      id: 'trailer',
      title: '雨霖铃预告片',
      year: '2025',
      douban_id: 36310054,
      source: 'trailer-source',
    });

    const results = filterPlaybackSearchResults([trailer, fullSeries], {
      title: '雨霖铃',
      year: '2026',
      doubanId: 36310054,
    });

    expect(results.map((result) => result.id)).toEqual(['series']);
  });

  it('matches season titles across Chinese numerals and Arabic numerals', () => {
    const exactSeason = buildSearchResult({
      id: 'season-five',
      title: '租借女友第5季',
      year: '2026',
      source: 'season-five-source',
    });
    const otherSeason = buildSearchResult({
      id: 'season-four',
      title: '租借女友第四季',
      year: '2025',
      source: 'season-four-source',
    });

    const results = filterPlaybackSearchResults([otherSeason, exactSeason], {
      title: '租借女友 第五季',
      year: '2026',
      searchType: 'tv',
    });

    expect(results.map((result) => result.id)).toEqual(['season-five']);
  });

  it('filters adult candidates before selecting playback sources', () => {
    const adultMatch = buildSearchResult({
      id: 'adult-match',
      title: '海角社区.第一次和表姐体验AV主角直击AV现场淫声笑语',
      source: 'adult-source',
      source_name: '🔞麻豆视频',
      year: '',
      episodes: [
        'https://example.com/adult-episode-1/index.m3u8',
        'https://example.com/adult-episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });
    const safeMatch = buildSearchResult({
      id: 'safe-match',
      title: '主角',
      source: 'safe-source',
      source_name: '正版资源',
      year: '2025',
      episodes: [
        'https://example.com/safe-episode-1/index.m3u8',
        'https://example.com/safe-episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });

    const results = filterPlaybackSearchResults([adultMatch, safeMatch], {
      title: '主角',
      year: '2025',
      searchType: 'tv',
    });

    expect(results.map((result) => result.id)).toEqual(['safe-match']);
  });

  it('keeps adult candidates when playback explicitly allows them', () => {
    const adultMatch = buildSearchResult({
      id: 'adult-match',
      title: '糖心Vlog.谁才是派对真正的主角',
      source: 'adult-source',
      source_name: '🔞麻豆视频',
      year: '',
      episodes: [
        'https://example.com/adult-episode-1/index.m3u8',
        'https://example.com/adult-episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });

    const results = filterPlaybackSearchResults([adultMatch], {
      title: '糖心Vlog.谁才是派对真正的主角',
      searchType: 'tv',
      allowAdultCandidates: true,
    });

    expect(results.map((result) => result.id)).toEqual(['adult-match']);
  });

  it('does not use loose substring matches for two-character titles', () => {
    const substringOnly = buildSearchResult({
      id: 'substring-only',
      title: '不起眼女主角培养法',
      source: 'safe-source',
      source_name: '普通资源',
      year: '2015',
      episodes: [
        'https://example.com/sub-episode-1/index.m3u8',
        'https://example.com/sub-episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });

    const results = filterPlaybackSearchResults([substringOnly], {
      title: '主角',
      searchType: 'tv',
    });

    expect(results).toEqual([]);
  });

  it('keeps prefix matches for short titles when the source starts with the title', () => {
    const prefixedMatch = buildSearchResult({
      id: 'prefixed-match',
      title: '主角2026',
      source: 'safe-source',
      source_name: '普通资源',
      year: '2026',
      episodes: [
        'https://example.com/prefix-episode-1/index.m3u8',
        'https://example.com/prefix-episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });

    const results = filterPlaybackSearchResults([prefixedMatch], {
      title: '主角',
      year: '2026',
      searchType: 'tv',
    });

    expect(results.map((result) => result.id)).toEqual(['prefixed-match']);
  });

  it('builds year-aware playback search query fallbacks', () => {
    expect(
      buildPlaybackSearchQueries({
        title: '雨霖铃',
        year: '2026',
      })
    ).toEqual([
      '雨霖铃',
      '雨霖铃 2026',
      '雨霖铃2026',
      '雨霖铃 (2026)',
      '雨霖铃(2026)',
    ]);
  });

  it('continues year fallback search until it finds a full exact match', async () => {
    const trailer = buildSearchResult({
      id: 'trailer',
      title: '雨霖铃预告片',
      year: '2025',
      douban_id: 36310054,
      source: 'trailer-source',
    });
    const fullSeries = buildSearchResult({
      id: 'series',
      title: '雨霖铃2026',
      year: '2026',
      douban_id: 36310054,
      source: 'series-source',
      episodes: [
        'https://example.com/episode-1/index.m3u8',
        'https://example.com/episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });
    const search = jest
      .fn()
      .mockResolvedValueOnce([trailer])
      .mockResolvedValueOnce([fullSeries]);
    getDataSourceMock.mockReturnValue({ search, detail: jest.fn() });

    const results = await searchPlaybackSources({
      title: '雨霖铃',
      year: '2026',
      doubanId: 36310054,
    });

    expect(results.map((result) => result.id)).toEqual(['series']);
    expect(search).toHaveBeenCalledTimes(2);
    expect(search).toHaveBeenNthCalledWith(1, '雨霖铃');
    expect(search).toHaveBeenNthCalledWith(2, '雨霖铃 2026');
  });

  it('hydrates addon catalog previews through meta and streams before returning playback sources', async () => {
    const preview = buildSearchResult({
      id: '101',
      title: '星际穿越',
      source: 'mock',
      source_name: 'MockSite',
      year: '2014',
      type_name: 'movie',
      episodes: [],
      episodes_titles: [],
    });
    const detail = buildSearchResult({
      id: '101',
      title: '星际穿越',
      source: 'mock',
      source_name: 'MockSite',
      year: '2014',
      type_name: 'movie',
      episodes: ['http://127.0.0.1:11473/media/vod/m3u8?source=mock&url=x'],
      episodes_titles: ['正片'],
    });
    const search = jest.fn().mockResolvedValue([preview]);
    const detailMock = jest.fn().mockResolvedValue(detail);
    getDataSourceMock.mockReturnValue({ search, detail: detailMock });

    const results = await searchPlaybackSources({
      title: '星际穿越',
      year: '2014',
      searchType: 'movie',
    });

    expect(results).toHaveLength(1);
    expect(results[0].episodes).toHaveLength(1);
    expect(detailMock).toHaveBeenCalledWith('movie', 'vod:mock:101');
  });

  it('uses the desktop local service playback prefetch route in desktop mode', async () => {
    const originalFetch = global.fetch;
    const safeMatch = buildSearchResult({
      id: 'desktop-safe-match',
      title: '主角',
      source: 'safe-source',
      source_name: '普通资源',
      year: '2025',
      episodes: [
        'https://example.com/safe-episode-1/index.m3u8',
        'https://example.com/safe-episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [safeMatch] }),
    });

    (getRuntimeConfig as jest.Mock).mockReturnValue({
      APP_TARGET: 'desktop',
    });
    global.fetch = fetchMock as typeof fetch;

    try {
      const results = await searchPlaybackSources({
        title: '主角',
        year: '2025',
        searchType: 'tv',
      });

      expect(results.map((result) => result.id)).toEqual([
        'desktop-safe-match',
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/playback/search-sources',
        expect.objectContaining({
          method: 'POST',
          cache: 'no-store',
        })
      );
      expect(
        JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
      ).toMatchObject({
        title: '主角',
        year: '2025',
        searchType: 'tv',
      });
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('does not fall back to the legacy query flow when the desktop playback prefetch route fails', async () => {
    const originalFetch = global.fetch;
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('desktop bridge unavailable'));

    (getRuntimeConfig as jest.Mock).mockReturnValue({
      APP_TARGET: 'desktop',
    });
    global.fetch = fetchMock as typeof fetch;

    try {
      await expect(
        searchPlaybackSources({
          title: '主角',
          year: '2025',
          searchType: 'tv',
        })
      ).rejects.toThrow('desktop bridge unavailable');
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(String(fetchMock.mock.calls[0][0])).toContain(
        '/api/playback/search-sources'
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('filters adult results from playback search requests before returning sources', async () => {
    const adultMatch = buildSearchResult({
      id: 'adult-match',
      title: '糖心Vlog.谁才是派对真正的主角',
      source: 'adult-source',
      source_name: '🔞麻豆视频',
      year: '',
      episodes: [
        'https://example.com/adult-episode-1/index.m3u8',
        'https://example.com/adult-episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });
    const safeMatch = buildSearchResult({
      id: 'safe-match',
      title: '主角',
      source: 'safe-source',
      source_name: '普通资源',
      year: '2025',
      episodes: [
        'https://example.com/safe-episode-1/index.m3u8',
        'https://example.com/safe-episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });
    const search = jest.fn().mockResolvedValue([adultMatch, safeMatch]);
    getDataSourceMock.mockReturnValue({ search, detail: jest.fn() });

    const results = await searchPlaybackSources({
      title: '主角',
      year: '2025',
      searchType: 'tv',
    });

    expect(results.map((result) => result.id)).toEqual(['safe-match']);
    expect(search).toHaveBeenCalled();
  });

  it('returns adult results from playback search requests when explicitly allowed', async () => {
    const adultMatch = buildSearchResult({
      id: 'adult-match',
      title: '糖心Vlog.谁才是派对真正的主角',
      source: 'adult-source',
      source_name: '🔞麻豆视频',
      year: '',
      episodes: [
        'https://example.com/adult-episode-1/index.m3u8',
        'https://example.com/adult-episode-2/index.m3u8',
      ],
      episodes_titles: ['第1集', '第2集'],
    });
    const search = jest.fn().mockResolvedValue([adultMatch]);
    getDataSourceMock.mockReturnValue({ search, detail: jest.fn() });

    const results = await searchPlaybackSources({
      title: '糖心Vlog.谁才是派对真正的主角',
      searchType: 'tv',
      allowAdultCandidates: true,
    });

    expect(results.map((result) => result.id)).toEqual(['adult-match']);
    expect(search).toHaveBeenCalled();
  });
});
