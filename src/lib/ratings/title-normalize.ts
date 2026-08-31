// 标题归一化：把「同一部片」的不同写法收敛成可比对的字符串。

const FULLWIDTH_BRACKETS = /[【[〔「『《〈]/g;
const FULLWIDTH_CLOSERS = /[】\]〕」』》〉]/g;
const SEPARATOR_CHARS = /[·・•:：\-_—–.,，。、/\\|]/g;
const SEASON_SUFFIX_PATTERNS: RegExp[] = [
  /第\s*[0-9一二三四五六七八九十]+\s*[季部]/g,
  /\bseason\s*\d+\b/gi,
  /\bs\d{1,2}\b/gi,
  /\bpart\s*\d+\b/gi,
  /[（(]\s*第?[0-9一二三四五六七八九十]+\s*[季部]\s*[)）]/g,
];

/**
 * 主归一化：NFKC（全角/兼容折半）、小写、统一括号、把标点折叠成空格。
 * 不剥离括号内容——副标题差异留待 title-match 用年份+类型做更强锚点。
 */
export function normalizeTitle(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(FULLWIDTH_BRACKETS, '(')
    .replace(FULLWIDTH_CLOSERS, ')')
    .replace(SEPARATOR_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 剥离季/部/篇章后缀，用于「同一剧集不同季」的粗匹配。 */
export function stripSeasonSuffix(input: string): string {
  let result = input;
  for (const pattern of SEASON_SUFFIX_PATTERNS) {
    result = result.replace(pattern, ' ');
  }
  return result.replace(/\s+/g, ' ').trim();
}

/** 剥离括号注释（副标题/别名/译名），保留主干。 */
export function stripParenthetical(input: string): string {
  return input.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 组合出供 cache key 与匹配用的紧凑键。 */
export function toTitleMatchKey(input: string): string {
  const normalized = normalizeTitle(stripSeasonSuffix(stripParenthetical(input)));
  return normalized.replace(/\s+/g, '');
}