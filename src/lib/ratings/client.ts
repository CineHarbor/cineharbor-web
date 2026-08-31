import { apiFetch } from '@/lib/transport/api-client';

import {
  RatingQueryItem,
  RatingsBatchRequest,
  RatingsBatchResponse,
  ResolvedRating,
} from './types';

interface RatingsBatchErrorPayload {
  error?: string;
}

/**
 * 前端统一评分入口：批量请求 `/api/ratings/batch`。
 * 失败时返回空映射，保证评分缺失不阻塞页面主链路。
 */
export async function fetchRatingsBatch(
  items: RatingQueryItem[]
): Promise<Record<string, ResolvedRating | undefined>> {
  if (items.length === 0) {
    return {};
  }

  const payload: RatingsBatchRequest = { items };
  const response = await apiFetch('/ratings/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as
      | RatingsBatchErrorPayload
      | null;
    throw new Error(data?.error || '获取评分失败');
  }

  const data = (await response.json()) as RatingsBatchResponse;
  return data.items ?? {};
}