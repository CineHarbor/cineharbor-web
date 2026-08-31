import { resolveMatch } from './title-match';
import { ExternalIds } from './types';

describe('resolveMatch', () => {
  it('显式外部 ID 优先级最高', () => {
    const externalIds: ExternalIds = { imdb_id: 'tt13539646' };
    expect(
      resolveMatch({ externalIds, title: '流浪地球2', year: '2023' })
    ).toEqual({ strategy: 'explicit_id', confidence: 1 });
  });

  it('豆瓣锚点 + 年份', () => {
    const externalIds: ExternalIds = { douban_id: '35267208' };
    expect(
      resolveMatch({ externalIds, title: '流浪地球2', year: '2023' })
    ).toEqual({ strategy: 'douban_anchor+year', confidence: 0.95 });
  });

  it('标题 + 年份', () => {
    expect(
      resolveMatch({ externalIds: {}, title: '流浪地球2', year: '2023' })
    ).toEqual({ strategy: 'title+year', confidence: 0.8 });
  });

  it('仅标题时降为模糊匹配', () => {
    expect(
      resolveMatch({ externalIds: {}, title: '流浪地球2' })
    ).toEqual({ strategy: 'title_fuzzy', confidence: 0.5 });
  });

  it('空输入回落 none', () => {
    expect(resolveMatch({ externalIds: {}, title: '' })).toEqual({
      strategy: 'none',
      confidence: 0,
    });
  });
});