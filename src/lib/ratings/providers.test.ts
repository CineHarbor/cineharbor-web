import { createImdbRatingProvider } from './providers/imdb';
import { createRtRatingProvider } from './providers/rt';

jest.mock('@/lib/douban', () => ({
  fetchDoubanData: jest.fn(),
}));

import { fetchDoubanData } from '@/lib/douban';

import { createDoubanRatingProvider } from './providers/douban';
import { ExternalIds, RatingQueryItem } from './types';

const mockedFetch = fetchDoubanData as jest.MockedFunction<
  typeof fetchDoubanData
>;

function context(externalIds: ExternalIds): {
  item: RatingQueryItem;
  externalIds: ExternalIds;
} {
  return { item: { key: 'k', title: 't' }, externalIds };
}

describe('douban provider', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('解析结构化评分', async () => {
    mockedFetch.mockResolvedValue({ rating: { value: 8.26, count: 12345 } });

    const entry = await createDoubanRatingProvider().resolve(
      context({ douban_id: '35267208' })
    );

    expect(entry).toMatchObject({
      source: 'douban',
      label: '豆瓣',
      value: 8.3,
      scale: 10,
      votes: 12345,
      url: 'https://movie.douban.com/subject/35267208',
    });
  });

  it('无 douban_id 或无效评分时优雅降级', async () => {
    expect(
      await createDoubanRatingProvider().resolve(context({}))
    ).toBeUndefined();

    mockedFetch.mockResolvedValue({ rating: {} });
    expect(
      await createDoubanRatingProvider().resolve(
        context({ douban_id: '11' })
      )
    ).toBeUndefined();
  });
});

describe('imdb provider', () => {
  it('命中注入索引返回评分', async () => {
    const provider = createImdbRatingProvider({
      index: { tt13539646: { value: 7.946, votes: 98000 } },
    });

    const entry = await provider.resolve(
      context({ imdb_id: 'tt13539646' })
    );

    expect(entry).toMatchObject({ source: 'imdb', value: 7.9, votes: 98000 });
  });

  it('未配置或无对应 id 时返回 undefined', async () => {
    const provider = createImdbRatingProvider({ index: {} });
    expect(await provider.resolve(context({}))).toBeUndefined();
  });
});

describe('rt provider', () => {
  it('命中索引返回 tomatometer', async () => {
    const provider = createRtRatingProvider({
      index: { the_wandering_earth_ii: { value: 81 } },
    });

    const entry = await provider.resolve(
      context({ rt_slug: 'the_wandering_earth_ii' })
    );

    expect(entry).toMatchObject({
      source: 'rt',
      value: 81,
      scale: 100,
      kind: 'tomatometer',
    });
  });

  it('未配置时返回 undefined', async () => {
    const provider = createRtRatingProvider({ index: {} });
    expect(await provider.resolve(context({ rt_id: 'x' }))).toBeUndefined();
  });
});