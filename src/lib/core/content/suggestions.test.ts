import { buildSuggestions } from './suggestions';

describe('buildSuggestions', () => {
  it('从标题拆词并按匹配打分', () => {
    const suggestions = buildSuggestions('雨霖铃', [
      { title: '雨霖铃' },
      { title: '雨霖铃 终章' },
      { title: '雨霖铃外传' },
    ]);

    expect(suggestions.map((item) => item.text)).toEqual([
      '雨霖铃',
      '雨霖铃外传',
    ]);
    expect(suggestions[0]).toMatchObject({ type: 'exact', score: 2 });
  });

  it('空结果返回空', () => {
    expect(buildSuggestions('测试', [])).toEqual([]);
  });
});
