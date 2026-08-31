import {
  isChineseAlias,
  mapType,
  parseYear,
} from '../../../../scripts/sync-imdb';

describe('sync-imdb 过滤逻辑', () => {
  it('mapType 归类', () => {
    expect(mapType('movie')).toBe('movie');
    expect(mapType('tvMovie')).toBe('movie');
    expect(mapType('tvSeries')).toBe('tv');
    expect(mapType('tvMiniSeries')).toBe('tv');
  });

  it('parseYear 解析与兜底', () => {
    expect(parseYear('2023')).toBe(2023);
    expect(parseYear('\\N')).toBe(0);
    expect(parseYear('')).toBe(0);
  });

  it('isChineseAlias 命中中文区域/语言', () => {
    expect(isChineseAlias('CN', '\\N')).toBe(true);
    expect(isChineseAlias('TW', '\\N')).toBe(true);
    expect(isChineseAlias('US', 'zh-CN')).toBe(true);
    expect(isChineseAlias('US', 'cmn')).toBe(true);
    expect(isChineseAlias('US', 'en')).toBe(false);
    expect(isChineseAlias('US', '\\N')).toBe(false);
  });
});