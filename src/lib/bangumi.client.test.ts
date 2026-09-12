import { GetBangumiCalendarData } from './bangumi.client';

const calendar = jest.fn();

jest.mock('@/lib/core/bangumi/addon-bangumi-source-factory', () => ({
  getAddonBangumiClient: () => ({ calendar }),
}));

describe('GetBangumiCalendarData', () => {
  it('走 bangumi addon 并丢掉无图条目', async () => {
    calendar.mockResolvedValue([
      {
        weekday: { en: 'Fri' },
        items: [
          {
            id: 1,
            name: 'A',
            name_cn: '甲',
            rating: { score: 8 },
            air_date: '2026-01-01',
            images: { large: 'a.jpg', common: '', medium: '', small: '', grid: '' },
          },
          {
            id: 2,
            name: 'B',
            name_cn: '乙',
            rating: { score: 0 },
            air_date: '',
            images: undefined,
          },
        ],
      },
    ]);

    const days = await GetBangumiCalendarData();
    expect(days[0].items).toHaveLength(1);
    expect(days[0].items[0].id).toBe(1);
  });
});
