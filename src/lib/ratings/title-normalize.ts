// 标题归一化：单一实现位于 imdb/title-key.js（运行时与离线同步脚本共用），
// 本文件仅做具名 re-export，避免 key 生成逻辑在多处漂移。

import {
  normalizeTitle as normalizeTitleImpl,
  normalizeTitleKey as normalizeTitleKeyImpl,
  stripParenthetical as stripParentheticalImpl,
  stripSeasonSuffix as stripSeasonSuffixImpl,
} from './imdb/title-key';

export function normalizeTitle(input: string): string {
  return normalizeTitleImpl(input);
}

export function stripSeasonSuffix(input: string): string {
  return stripSeasonSuffixImpl(input);
}

export function stripParenthetical(input: string): string {
  return stripParentheticalImpl(input);
}

export function toTitleMatchKey(input: string): string {
  return normalizeTitleKeyImpl(input);
}