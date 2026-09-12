jest.mock('@/lib/core/content/addon-content-data-source-factory', () => ({
  getAddonContentDataSource: jest.fn(),
}));

jest.mock('@/lib/runtime-config', () => ({
  getRuntimeConfig: jest.fn(() => ({})),
}));

jest.mock('@/lib/yellow', () => ({
  filterAdultContentResults: jest.fn((results) => results),
}));

import {
  getAddonContentDataSource,
} from '@/lib/core/content/addon-content-data-source-factory';
import { getRuntimeConfig } from '@/lib/runtime-config';
import { filterAdultContentResults } from '@/lib/yellow';

import {
  fetchContentDetail,
  fetchContentSearchResults,
  fetchContentSuggestions,
} from './content-discovery-client';

interface AddonDataSourceLike {
  detail: jest.Mock;
  search: jest.Mock;
}

const getDataSourceMock = getAddonContentDataSource as unknown as jest.MockedFunction<
  () => AddonDataSourceLike
>;
const getRuntimeConfigMock = getRuntimeConfig as jest.MockedFunction<
  typeof getRuntimeConfig
>;
const filterAdultMock = filterAdultContentResults as jest.MockedFunction<
  typeof filterAdultContentResults
>;

describe('content discovery client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('loads content detail through the addon data source (composite vod id)', async () => {
    const payload = {
      id: '1001',
      source: 'demo',
      title: '测试影片',
      episodes: ['https://example.com/1.m3u8'],
      episodes_titles: ['第1集'],
    };
    const detailMock = jest.fn().mockResolvedValue(payload);
    getDataSourceMock.mockReturnValue({ detail: detailMock, search: jest.fn() });

    await expect(
      fetchContentDetail({ source: 'demo', id: '1001' })
    ).resolves.toEqual(payload);

    expect(detailMock).toHaveBeenCalledWith('movie', 'vod:demo:1001');
  });

  it('keeps an existing vod: id prefix unchanged', async () => {
    const detailMock = jest.fn().mockResolvedValue({ id: 'x', source: 'demo' });
    getDataSourceMock.mockReturnValue({ detail: detailMock, search: jest.fn() });

    await fetchContentDetail({ source: 'demo', id: 'vod:demo:1001' });

    expect(detailMock).toHaveBeenCalledWith('movie', 'vod:demo:1001');
  });

  it('propagates a missing detail as an addon-path error', async () => {
    const detailMock = jest.fn().mockResolvedValue(null);
    getDataSourceMock.mockReturnValue({ detail: detailMock, search: jest.fn() });

    await expect(
      fetchContentDetail({ source: 'demo', id: 'missing' })
    ).rejects.toThrow('获取视频详情失败');
  });

  it('loads content search through the vod addon and filters adult by default', async () => {
    const results = [
      {
        id: '2002',
        source: 'demo',
        title: '测试归集',
        episodes: ['https://example.com/1.m3u8'],
        episodes_titles: ['第1集'],
      },
    ];
    const searchMock = jest.fn().mockResolvedValue(results);
    getDataSourceMock.mockReturnValue({
      detail: jest.fn(),
      search: searchMock,
    });
    filterAdultMock.mockReturnValue(results);

    await expect(fetchContentSearchResults('测试归集')).resolves.toEqual(
      results
    );
    expect(searchMock).toHaveBeenCalledWith('测试归集');
    expect(filterAdultMock).toHaveBeenCalledWith(results);
  });

  it('skips adult filter when allowAdultResults is true', async () => {
    const results = [{ id: '1', title: 'onlyfans' }];
    const searchMock = jest.fn().mockResolvedValue(results);
    getDataSourceMock.mockReturnValue({
      detail: jest.fn(),
      search: searchMock,
    });

    await expect(
      fetchContentSearchResults('测试归集', { allowAdultResults: true })
    ).resolves.toEqual(results);
    expect(filterAdultMock).not.toHaveBeenCalled();
  });

  it('skips adult filter when DISABLE_YELLOW_FILTER is on', async () => {
    getRuntimeConfigMock.mockReturnValue({ DISABLE_YELLOW_FILTER: true });
    const results = [{ id: '1', title: 'onlyfans' }];
    getDataSourceMock.mockReturnValue({
      detail: jest.fn(),
      search: jest.fn().mockResolvedValue(results),
    });

    await expect(fetchContentSearchResults('测试')).resolves.toEqual(results);
    expect(filterAdultMock).not.toHaveBeenCalled();
  });

  it('builds suggestions from addon search titles', async () => {
    getDataSourceMock.mockReturnValue({
      detail: jest.fn(),
      search: jest.fn().mockResolvedValue([
        { title: '测试剧' },
        { title: '测试剧 终章' },
      ]),
    });
    filterAdultMock.mockImplementation((items) => items);

    const suggestions = await fetchContentSuggestions('测试剧');
    expect(suggestions.map((item) => item.text)).toEqual(['测试剧']);
    expect(suggestions[0]).toMatchObject({ type: 'exact', score: 2 });
  });
});
