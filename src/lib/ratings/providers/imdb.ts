import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { toTitleMatchKey } from '../title-normalize';
import { RatingEntry, RatingProvider, RatingProviderContext } from '../types';

// IMDb 评分数据源（docs/plans/douban-imdb-rt-integration-plan.md P1）：
// 零 key —— 使用官方 datasets（title.basics / title.akas / title.ratings），
// 由 `pnpm sync:imdb` 浓缩为本地索引（默认 `data/imdb-index.json`，覆盖用
// IMDB_INDEX_PATH）。运行时按「显式 imdb_id」或「标题+年份」匹配取评分；
// 未同步索引 / 未命中时优雅降级（返回 undefined），不阻塞其它 provider。

export interface ImdbRatingDatum {
  value: number;
  votes?: number;
}

export interface ImdbTitleEntry {
  id: string;
  year: number;
  type: 'movie' | 'tv';
  votes: number;
}

export interface ImdbIndex {
  version: number;
  generated_at: string;
  ratings: Record<string, ImdbRatingDatum>;
  titles: Record<string, ImdbTitleEntry[]>;
}

let loadedIndex: ImdbIndex | null = null;
let loadAttempted = false;
let loadPromise: Promise<ImdbIndex | null> | null = null;

function resolveIndexPath(): string {
  return (
    process.env.IMDB_INDEX_PATH ||
    path.join(process.cwd(), 'data', 'imdb-index.json')
  );
}

async function loadImdbIndex(): Promise<ImdbIndex | null> {
  if (loadAttempted) {
    return loadedIndex;
  }
  if (loadPromise) {
    return loadPromise;
  }

  loadAttempted = true;
  loadPromise = (async () => {
    try {
      const raw = await readFile(resolveIndexPath(), 'utf8');
      const parsed = JSON.parse(raw) as ImdbIndex;
      if (parsed && typeof parsed.ratings === 'object' && typeof parsed.titles === 'object') {
        loadedIndex = parsed;
      }
    } catch (error) {
      // 未同步索引（ENOENT）属正常态，静默降级；其它错误记录一次。
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') {
        // eslint-disable-next-line no-console
        console.warn(
          '[ratings:imdb] 索引加载失败',
          error instanceof Error ? error.message : error
        );
      }
    } finally {
      loadPromise = null;
    }
    return loadedIndex;
  })();

  return loadPromise;
}

function parseQueryYear(year?: string): number {
  const parsed = Number.parseInt((year || '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeQueryType(
  type?: RatingProviderContext['item']['type']
): 'movie' | 'tv' | undefined {
  if (type === 'movie') {
    return 'movie';
  }
  if (type === 'tv' || type === 'anime' || type === 'show') {
    return 'tv';
  }
  return undefined;
}

function pickBestCandidate(
  candidates: ImdbTitleEntry[],
  year?: string,
  type?: RatingProviderContext['item']['type']
): ImdbTitleEntry | undefined {
  const queryYear = parseQueryYear(year);
  const queryType = normalizeQueryType(type);

  let best: ImdbTitleEntry | undefined;
  let bestScore = -1;

  for (const candidate of candidates) {
    let score = 0;
    if (queryYear > 0) {
      if (candidate.year === queryYear) {
        score += 3;
      } else if (candidate.type === 'tv' && Math.abs(candidate.year - queryYear) <= 1) {
        score += 1;
      } else {
        continue; // 年份明确且强不一致 → 排除
      }
    }
    if (queryType && candidate.type === queryType) {
      score += 1;
    }

    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return best;
}

function toEntry(id: string, datum: ImdbRatingDatum): RatingEntry {
  return {
    source: 'imdb',
    label: 'IMDb',
    value: Math.round(datum.value * 10) / 10,
    scale: 10,
    votes: datum.votes,
    url: `https://www.imdb.com/title/${id}/`,
    updated_at: Date.now(),
  };
}

export function createImdbRatingProvider(options?: {
  index?: ImdbIndex | null;
}): RatingProvider {
  // 注入索引（测试用）时跳过文件加载。
  const injected = options?.index ?? null;

  return {
    source: 'imdb',
    async resolve(
      context: RatingProviderContext
    ): Promise<RatingEntry | undefined> {
      const index = injected ?? (await loadImdbIndex());
      if (!index) {
        return undefined;
      }

      const explicitId =
        context.externalIds.imdb_id ?? context.item.imdb_id?.trim();
      if (explicitId) {
        const datum = index.ratings[explicitId];
        return datum && Number.isFinite(datum.value)
          ? toEntry(explicitId, datum)
          : undefined;
      }

      const title = context.item.title?.trim();
      if (!title) {
        return undefined;
      }

      const key = toTitleMatchKey(title);
      const candidates = index.titles[key];
      if (!candidates || candidates.length === 0) {
        return undefined;
      }

      const best = pickBestCandidate(candidates, context.item.year, context.item.type);
      if (!best) {
        return undefined;
      }

      const datum = index.ratings[best.id];
      return datum && Number.isFinite(datum.value)
        ? toEntry(best.id, datum)
        : undefined;
    },
  };
}