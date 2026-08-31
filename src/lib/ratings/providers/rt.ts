import { RatingEntry, RatingProvider, RatingProviderContext } from '../types';

// Rotten Tomatoes 只展示 Tomatometer（docs/plans/douban-imdb-rt-integration-plan.md P2）。
// 数据应来自授权 feed；未取得 feed 前以 RT_RATINGS_JSON（rt_id/rt_slug → 百分比）门控，
// 未配置时优雅降级（返回 undefined）。

interface RtRatingDatum {
  value: number;
}

type RtIndex = Record<string, RtRatingDatum | undefined>;

function parseEnvIndex(raw?: string): RtIndex | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as RtIndex) : null;
  } catch {
    return null;
  }
}

export function createRtRatingProvider(options?: {
  index?: RtIndex;
}): RatingProvider {
  const index = options?.index ?? parseEnvIndex(process.env.RT_RATINGS_JSON);
  const enabled = Boolean(index);

  return {
    source: 'rt',
    async resolve(context: RatingProviderContext): Promise<RatingEntry | undefined> {
      if (!enabled) {
        return undefined;
      }

      const key =
        context.externalIds.rt_id ??
        context.externalIds.rt_slug ??
        context.item.rt_id?.trim() ??
        context.item.rt_slug?.trim();
      if (!key) {
        return undefined;
      }

      const datum = index?.[key];
      if (!datum || !Number.isFinite(datum.value)) {
        return undefined;
      }

      return {
        source: 'rt',
        label: 'RT',
        value: Math.round(datum.value),
        scale: 100,
        kind: 'tomatometer',
        url: `https://www.rottentomatoes.com/m/${key}`,
        updated_at: Date.now(),
      };
    },
  };
}