import {
  normalizeTitle,
  stripParenthetical,
  stripSeasonSuffix,
  toTitleMatchKey,
} from './title-normalize';

describe('normalizeTitle', () => {
  it('全角转半角并小写', () => {
    expect(normalizeTitle('ＡＢＣ　１２３')).toBe('abc 123');
  });

  it('统一中文/全角括号为英文括号', () => {
    expect(normalizeTitle('流浪地球【2】')).toBe('流浪地球(2)');
    expect(normalizeTitle('流浪地球（2）')).toBe('流浪地球(2)');
  });

  it('折叠标点与多余空白', () => {
    expect(normalizeTitle('  The   Matrix:  1999 ')).toBe('the matrix 1999');
  });
});

describe('stripSeasonSuffix', () => {
  it('剥离第X季', () => {
    expect(stripSeasonSuffix('权力的游戏 第八季')).toBe('权力的游戏');
  });

  it('剥离 Season N / S01', () => {
    expect(stripSeasonSuffix('Stranger Things Season 4')).toBe(
      'Stranger Things'
    );
    expect(stripSeasonSuffix('Westworld S01')).toBe('Westworld');
  });
});

describe('stripParenthetical', () => {
  it('剥离括号副标题', () => {
    expect(stripParenthetical('The Office (US)')).toBe('The Office');
  });
});

describe('toTitleMatchKey', () => {
  it('组合归一化结果', () => {
    expect(toTitleMatchKey('The Office (US)')).toBe('theoffice');
  });
});