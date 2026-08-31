import { ExternalIds, RatingQueryItem } from './types';

function normalizeDoubanId(value?: number | string): string | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value.toString() : undefined;
  }

  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed.toString() : undefined;
}

/** 从查询项收集外部 ID，统一为字符串形态。 */
export function resolveExternalIds(item: RatingQueryItem): ExternalIds {
  return {
    douban_id: normalizeDoubanId(item.douban_id),
    imdb_id: item.imdb_id?.trim() || undefined,
    rt_id: item.rt_id?.trim() || undefined,
    rt_slug: item.rt_slug?.trim() || undefined,
  };
}