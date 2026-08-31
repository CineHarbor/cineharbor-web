import { resolveRating, resolveRatingsBatch } from './resolver';
import { RatingEntry, RatingProvider } from './types';

function entry(
  source: RatingEntry['source'],
  value: number
): RatingEntry {
  return { source, label: source, value, scale: 10, updated_at: 1 };
}

const doubanProvider: RatingProvider = {
  source: 'douban',
  async resolve({ externalIds }) {
    return externalIds.douban_id
      ? entry('douban', Number(externalIds.douban_id))
      : undefined;
  },
};

const imdbProvider: RatingProvider = {
  source: 'imdb',
  async resolve({ externalIds }) {
    return externalIds.imdb_id ? entry('imdb', 7.5) : undefined;
  },
};

describe('resolveRatingsBatch', () => {
  it('按 key 映射结果并聚合多源', async () => {
    const result = await resolveRatingsBatch(
      [
        {
          key: 'a',
          title: '流浪地球2',
          douban_id: '8',
          imdb_id: 'tt13539646',
        },
        { key: 'b', title: '无外部id', douban_id: '' },
      ],
      [doubanProvider, imdbProvider]
    );

    expect(result.a?.ratings.douban?.value).toBe(8);
    expect(result.a?.ratings.imdb?.value).toBe(7.5);
    expect(result.b?.ratings).toEqual({});
  });

  it('单个 provider 抛错不影响其它源', async () => {
    const throwing: RatingProvider = {
      source: 'rt',
      async resolve() {
        throw new Error('boom');
      },
    };

    const result = await resolveRating(
      { key: 'a', title: 't', douban_id: '9' },
      [doubanProvider, throwing]
    );

    expect(result?.ratings.douban?.value).toBe(9);
    expect(result?.ratings.rt).toBeUndefined();
  });
});