import { createImdbRatingProvider, ImdbIndex } from './providers/imdb';
import { createRtRatingProvider } from './providers/rt';

jest.mock('@/lib/douban', () => ({
  fetchDoubanData: jest.fn(),
}));

import { fetchDoubanData } from '@/lib/douban';

import { createDoubanRatingProvider } from './providers/douban';
import { toTitleMatchKey } from './title-normalize';
import {
  ExternalIds,
  RatingProviderContext,
  RatingQueryItem,
} from './types';

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

function imdbIndex(
  titles: ImdbIndex['titles'] = {},
  ratings: ImdbIndex['ratings'] = {}
): ImdbIndex {
  return { version: 1, generated_at: '', ratings, titles };
}

function imdbContext(overrides: Partial<RatingQueryItem>): RatingProviderContext {
  return {
    item: { key: 'k', title: '流浪地球2', ...overrides },
    externalIds: {},
  };
}

describe('imdb provider', () => {
  it('显式 imdb_id 命中评分', async () => {
    const provider = createImdbRatingProvider({
      index: imdbIndex(
        {},
        { tt13539646: { value: 7.946, votes: 98000 } }
      ),
    });

    const entry = await provider.resolve(
      imdbContext({ imdb_id: 'tt13539646' })
    );

    expect(entry).toMatchObject({ source: 'imdb', value: 7.9, votes: 98000 });
  });

  it('按标题+年份匹配并返回评分', async () => {
    const key = toTitleMatchKey('流浪地球2');
    const provider = createImdbRatingProvider({
      index: imdbIndex(
        { [key]: [{ id: 'tt13539646', year: 2023, type: 'movie', votes: 98000 }] },
        { tt13539646: { value: 7.946, votes: 98000 } }
      ),
    });

    const entry = await provider.resolve(
      imdbContext({ title: '流浪地球2', year: '2023', type: 'movie' })
    );

    expect(entry).toMatchObject({
      source: 'imdb',
      value: 7.9,
      votes: 98000,
      url: 'https://www.imdb.com/title/tt13539646/',
    });
  });

  it('年份强不一致时返回 undefined', async () => {
    const key = toTitleMatchKey('流浪地球2');
    const provider = createImdbRatingProvider({
      index: imdbIndex(
        { [key]: [{ id: 'tt13539646', year: 2023, type: 'movie', votes: 98000 }] },
        { tt13539646: { value: 7.946, votes: 98000 } }
      ),
    });

    const entry = await provider.resolve(
      imdbContext({ title: '流浪地球2', year: '1990', type: 'movie' })
    );

    expect(entry).toBeUndefined();
  });

  it('空索引或无匹配返回 undefined', async () => {
    const provider = createImdbRatingProvider({ index: imdbIndex() });
    expect(await provider.resolve(imdbContext({}))).toBeUndefined();
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