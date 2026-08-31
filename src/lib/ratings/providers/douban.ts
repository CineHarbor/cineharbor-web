import { fetchDoubanData } from '@/lib/douban';

import { RatingEntry, RatingProvider, RatingProviderContext } from '../types';

interface DoubanSubjectRatingResponse {
  rating?: {
    value?: number | null;
    count?: number | null;
  };
}

const DOUBAN_SUBJECT_URL = (id: string) =>
  `https://m.douban.com/rexxar/api/v2/subject/${id}?for_mobile=1`;

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 豆瓣 provider：真实抓取结构化评分（value + votes + 详情链接）。 */
export function createDoubanRatingProvider(): RatingProvider {
  return {
    source: 'douban',
    async resolve(context: RatingProviderContext): Promise<RatingEntry | undefined> {
      const id = context.externalIds.douban_id;
      if (!id) {
        return undefined;
      }

      const data = await fetchDoubanData<DoubanSubjectRatingResponse>(
        DOUBAN_SUBJECT_URL(id)
      );
      const value = data.rating?.value;

      if (typeof value !== 'number' || !Number.isFinite(value)) {
        return undefined;
      }

      return {
        source: 'douban',
        label: '豆瓣',
        value: roundToOne(value),
        scale: 10,
        votes:
          typeof data.rating?.count === 'number'
            ? data.rating.count
            : undefined,
        url: `https://movie.douban.com/subject/${id}`,
        updated_at: Date.now(),
      };
    },
  };
}