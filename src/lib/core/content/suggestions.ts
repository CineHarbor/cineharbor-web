//! 从搜索结果抽联想词（纯函数）。原生 `/api/search/suggestions` 退役后由客户端对 addon 搜索结果调用。

export interface ContentSuggestion {
  text: string;
  type: 'exact' | 'related' | 'suggestion';
  score: number;
}

export function buildSuggestions(
  query: string,
  results: Array<{ title?: string }>
): ContentSuggestion[] {
  const queryLower = query.toLowerCase();
  const realKeywords = Array.from(
    new Set(
      results
        .map((result) => result.title)
        .filter((title): title is string => Boolean(title))
        .flatMap((title) => title.split(/[ -:：·、-]/))
        .filter(
          (word) => word.length > 1 && word.toLowerCase().includes(queryLower)
        )
    )
  ).slice(0, 8);

  return realKeywords
    .map((word) => {
      const wordLower = word.toLowerCase();
      const queryWords = queryLower.split(/[ -:：·、-]/);
      let score = 1.0;

      if (wordLower === queryLower) {
        score = 2.0;
      } else if (
        wordLower.startsWith(queryLower) ||
        wordLower.endsWith(queryLower)
      ) {
        score = 1.8;
      } else if (
        queryWords.some((queryWord) => wordLower.includes(queryWord))
      ) {
        score = 1.5;
      }

      let type: ContentSuggestion['type'] = 'related';
      if (score >= 2.0) {
        type = 'exact';
      } else if (score < 1.5) {
        type = 'suggestion';
      }

      return {
        text: word,
        type,
        score,
      };
    })
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      const typePriority: Record<ContentSuggestion['type'], number> = {
        exact: 3,
        related: 2,
        suggestion: 1,
      };

      return typePriority[right.type] - typePriority[left.type];
    });
}
