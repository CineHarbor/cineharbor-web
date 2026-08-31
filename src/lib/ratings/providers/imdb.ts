import { RatingEntry, RatingProvider, RatingProviderContext } from '../types';

// IMDb 评分数据源（docs/plans/douban-imdb-rt-integration-plan.md P1）：
// - 自用/非商业：官方 datasets 的 title.ratings.tsv.gz，由同步脚本浓缩为
//   `{ "<imdb_id>": { "value": 7.9, "votes": 123456 } }` 后注入 IMDB_RATINGS_JSON；
// - 公开部署/商业：官方 API（未来在 resolve 内切换 transport）。
// 未配置时优雅降级（返回 undefined），不阻塞其它 provider。

interface ImdbRatingDatum {
  value: number;
  votes?: number;
}

type ImdbIndex = Record<string, ImdbRatingDatum | undefined>;

function parseEnvIndex(raw?: string): ImdbIndex | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === 'object'
      ? (parsed as ImdbIndex)
      : null;
  } catch {
    return null;
  }
}

export function createImdbRatingProvider(options?: {
  index?: ImdbIndex;
}): RatingProvider {
  const index = options?.index ?? parseEnvIndex(process.env.IMDB_RATINGS_JSON);

  return {
    source: 'imdb',
    async resolve(context: RatingProviderContext): Promise<RatingEntry | undefined> {
      const id = context.externalIds.imdb_id ?? context.item.imdb_id?.trim();
      if (!id || !index) {
        return undefined;
      }

      const datum = index[id];
      if (!datum || !Number.isFinite(datum.value)) {
        return undefined;
      }

      return {
        source: 'imdb',
        label: 'IMDb',
        value: Math.round(datum.value * 10) / 10,
        scale: 10,
        votes: datum.votes,
        url: `https://www.imdb.com/title/${id}/`,
        updated_at: Date.now(),
      };
    },
  };
}