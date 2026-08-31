import { TtlCache } from './cache';
import { resolveExternalIds } from './external-ids';
import { createDoubanRatingProvider } from './providers/douban';
import { createImdbRatingProvider } from './providers/imdb';
import { createRtRatingProvider } from './providers/rt';
import { resolveMatch } from './title-match';
import { toTitleMatchKey } from './title-normalize';
import {
  RatingEntry,
  RatingProvider,
  RatingQueryItem,
  RatingsBundle,
  ResolvedRating,
} from './types';

const RESOLVE_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 条目匹配/结果缓存 6 小时
const MAX_CONCURRENCY = 5;
const RESOLVE_CACHE = new TtlCache<ResolvedRating>({
  defaultTtlMs: RESOLVE_CACHE_TTL_MS,
  maxEntries: 5000,
});

function buildCacheKey(item: RatingQueryItem): string {
  const externalIds = resolveExternalIds(item);
  const idPart = [
    externalIds.douban_id,
    externalIds.imdb_id,
    externalIds.rt_id,
    externalIds.rt_slug,
  ]
    .filter(Boolean)
    .join('|');
  const titleKey = toTitleMatchKey(item.title);
  return `${item.type ?? ''}|${item.year ?? ''}|${titleKey}|${idPart}`;
}

export interface RatingVisibility {
  douban?: boolean;
  imdb?: boolean;
  rt?: boolean;
}

/** 按展示开关构建 provider 列表；`false` 表示该源不参与解析。 */
export function buildDefaultProviders(
  shown: RatingVisibility = {}
): RatingProvider[] {
  const providers: RatingProvider[] = [];
  if (shown.douban !== false) {
    providers.push(createDoubanRatingProvider());
  }
  if (shown.imdb !== false) {
    providers.push(createImdbRatingProvider());
  }
  if (shown.rt !== false) {
    providers.push(createRtRatingProvider());
  }
  return providers;
}

// 让每个 provider 的失败只影响自身：单个源不可用不阻塞其它源。
async function resolveProviderSafely(
  provider: RatingProvider,
  item: RatingQueryItem,
  externalIds: ReturnType<typeof resolveExternalIds>
): Promise<RatingEntry | undefined> {
  try {
    return await provider.resolve({ item, externalIds });
  } catch (error) {
    // 单一 provider 失败只记录并降级，不影响其它源与页面主链路。
    // eslint-disable-next-line no-console
    console.warn(
      `[ratings] provider "${provider.source}" failed`,
      error instanceof Error ? error.message : error
    );
    return undefined;
  }
}

export async function resolveRating(
  item: RatingQueryItem,
  providers: RatingProvider[] = buildDefaultProviders()
): Promise<ResolvedRating | undefined> {
  const externalIds = resolveExternalIds(item);

  const ratings: RatingsBundle = {};
  await Promise.all(
    providers.map(async (provider) => {
      const entry = await resolveProviderSafely(provider, item, externalIds);
      if (entry) {
        ratings[provider.source] = entry;
      }
    })
  );

  return {
    external_ids: externalIds,
    ratings,
    match: resolveMatch({
      externalIds,
      title: item.title,
      year: item.year,
    }),
  };
}

/**
 * 批量解析：按 cache key 去重解析、限并发、结果写回共享缓存。
 * 返回 `Record<key, ResolvedRating | undefined>`，key 为查询项的 key。
 */
export async function resolveRatingsBatch(
  items: RatingQueryItem[],
  providers: RatingProvider[] = buildDefaultProviders()
): Promise<Record<string, ResolvedRating | undefined>> {
  // 去重：同一 cache key 只解析一次，重复 key 的查询项共用结果。
  const keyToCacheKey = new Map<string, string>();
  const cacheKeyToItem = new Map<string, RatingQueryItem>();
  const cacheKeyToResult = new Map<string, ResolvedRating>();

  const uniqueItems: RatingQueryItem[] = [];
  for (const item of items) {
    const cacheKey = buildCacheKey(item);
    const existingItem = cacheKeyToItem.get(cacheKey);
    if (existingItem) {
      keyToCacheKey.set(item.key, cacheKey);
      continue;
    }
    cacheKeyToItem.set(cacheKey, item);
    keyToCacheKey.set(item.key, cacheKey);
    uniqueItems.push(item);
  }

  // 内存缓存命中
  for (const item of uniqueItems) {
    const cacheKey = buildCacheKey(item);
    const cached = RESOLVE_CACHE.get(cacheKey);
    if (cached) {
      cacheKeyToResult.set(cacheKey, cached);
    }
  }

  const toResolve = uniqueItems.filter(
    (item) => !cacheKeyToResult.has(buildCacheKey(item))
  );

  // 限并发逐个解析
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < toResolve.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      const item = toResolve[currentIndex];
      if (!item) {
        return;
      }

      const result = await resolveRating(item, providers);
      const cacheKey = buildCacheKey(item);
      if (result) {
        cacheKeyToResult.set(cacheKey, result);
        RESOLVE_CACHE.set(cacheKey, result);
      }
    }
  };

  const workerCount = Math.max(
    1,
    Math.min(MAX_CONCURRENCY, toResolve.length)
  );
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const output: Record<string, ResolvedRating | undefined> = {};
  for (const item of items) {
    const cacheKey = keyToCacheKey.get(item.key);
    if (cacheKey) {
      output[item.key] = cacheKeyToResult.get(cacheKey);
    }
  }
  return output;
}