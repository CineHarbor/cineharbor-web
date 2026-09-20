import { SearchResult } from '@/lib/types';

/** Preserve addon-issued capabilities byte-for-byte; never wrap or regenerate them. */
export function normalizeVodEpisodeUrl(
  _source: string,
  upstreamUrl: string
): string {
  return upstreamUrl.trim();
}

export function normalizeVodEpisodeUrlForDownload(
  source: string,
  upstreamUrl: string
): string {
  return normalizeVodEpisodeUrl(source, upstreamUrl);
}

export function normalizeVodDetailForPlayback(
  detail: SearchResult
): SearchResult {
  return {
    ...detail,
    episodes: detail.episodes.map((url) =>
      normalizeVodEpisodeUrl(detail.source, url)
    ),
  };
}

export function normalizeVodSearchResultsForPlayback(
  results: SearchResult[]
): SearchResult[] {
  return results.map(normalizeVodDetailForPlayback);
}
