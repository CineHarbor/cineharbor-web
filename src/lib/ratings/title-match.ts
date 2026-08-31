import { ExternalIds, RatingMatch } from './types';

// 匹配优先级由高到低：显式外部 ID → 豆瓣锚点 → 标题+年份+类型 → 标题模糊。
// 当前阶段只产出策略与置信度；douban_id → imdb/rt 的反查留待 P1/P2 数据集接入。

export function resolveMatch(params: {
  externalIds: ExternalIds;
  title: string;
  year?: string;
}): RatingMatch {
  const { externalIds, title, year } = params;
  const hasExplicitId = Boolean(
    externalIds.imdb_id || externalIds.rt_id || externalIds.rt_slug
  );
  const hasDoubanAnchor = Boolean(externalIds.douban_id);
  const hasTitle = Boolean(trimTitle(title));
  const hasYear = Boolean(year && year !== 'unknown' && year.trim() !== '');

  if (hasExplicitId) {
    return { strategy: 'explicit_id', confidence: 1 };
  }

  if (hasDoubanAnchor) {
    return {
      strategy: hasYear ? 'douban_anchor+year' : 'douban_anchor',
      confidence: hasYear ? 0.95 : 0.85,
    };
  }

  if (hasTitle && hasYear) {
    return { strategy: 'title+year', confidence: 0.8 };
  }

  if (hasTitle) {
    return { strategy: 'title_fuzzy', confidence: 0.5 };
  }

  return { strategy: 'none', confidence: 0 };
}

function trimTitle(title: string): string {
  return title.trim();
}