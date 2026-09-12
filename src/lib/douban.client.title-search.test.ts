import { getDoubanTitleSearch } from './douban.client';

const search = jest.fn();

jest.mock('@/lib/core/douban/addon-douban-source-factory', () => ({
  getAddonDoubanClient: () => ({ search }),
}));

describe('getDoubanTitleSearch', () => {
  beforeEach(() => {
    search.mockReset();
    search.mockResolvedValue([
      {
        id: '3541415',
        title: '星际穿越 Interstellar',
        poster: 'p.jpg',
        rate: '9.4',
        year: '2014',
        playType: 'movie',
      },
    ]);
  });

  it('空 query 抛错且不打 addon', async () => {
    await expect(getDoubanTitleSearch({ query: '  ' })).rejects.toThrow(
      'query 参数不能为空'
    );
    expect(search).not.toHaveBeenCalled();
  });

  it('走 douban addon 并包成 DoubanResult', async () => {
    const result = await getDoubanTitleSearch({
      query: '星际穿越',
      pageLimit: 45,
      pageStart: 0,
    });

    expect(search).toHaveBeenCalledWith('星际穿越', {
      limit: 45,
      start: 0,
    });
    expect(result).toEqual({
      code: 200,
      message: '获取成功',
      list: [
        {
          id: '3541415',
          title: '星际穿越 Interstellar',
          poster: 'p.jpg',
          rate: '9.4',
          year: '2014',
          playType: 'movie',
        },
      ],
    });
  });
});
