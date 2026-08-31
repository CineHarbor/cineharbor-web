'use strict';
// 标题归一键 —— 单一实现，供两部分共用：
//   - src/lib/ratings/title-normalize.ts（运行时，re-export 本文件）
//   - scripts/sync-imdb.js（离线建索引时生成与运行时一致的 key）
// 保持 CJS 以便 Node 脚本直接 require；改归一化规则只改这里。

const FULLWIDTH_BRACKETS = /[【[〔「『《〈]/g;
const FULLWIDTH_CLOSERS = /[】\]〕」』》〉]/g;
const SEPARATOR_CHARS = /[·・•:：\-_—–.,，。、/\\|]/g;
const SEASON_SUFFIX_PATTERNS = [
  /第\s*[0-9一二三四五六七八九十]+\s*[季部]/g,
  /\bseason\s*\d+\b/gi,
  /\bs\d{1,2}\b/gi,
  /\bpart\s*\d+\b/gi,
  /[（(]\s*第?[0-9一二三四五六七八九十]+\s*[季部]\s*[)）]/g,
];

function normalizeTitle(input) {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(FULLWIDTH_BRACKETS, '(')
    .replace(FULLWIDTH_CLOSERS, ')')
    .replace(SEPARATOR_CHARS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripSeasonSuffix(input) {
  let result = input;
  for (const pattern of SEASON_SUFFIX_PATTERNS) {
    result = result.replace(pattern, ' ');
  }
  return result.replace(/\s+/g, ' ').trim();
}

function stripParenthetical(input) {
  return input.replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
}

// 组合 key：NFKC + 小写 + 去括号副标题 + 去季部后缀 + 折叠空白。
function normalizeTitleKey(input) {
  return normalizeTitle(stripSeasonSuffix(stripParenthetical(input))).replace(
    /\s+/g,
    ''
  );
}

module.exports = {
  normalizeTitle,
  stripSeasonSuffix,
  stripParenthetical,
  normalizeTitleKey,
};