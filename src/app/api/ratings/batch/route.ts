import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { buildDefaultProviders, resolveRatingsBatch } from '@/lib/ratings/resolver';
import {
  RatingQueryItem,
  RatingsBatchRequest,
} from '@/lib/ratings/types';

export const runtime = 'nodejs';

const MAX_ITEMS_PER_REQUEST = 50;
const RATING_TYPES = new Set(['movie', 'tv', 'anime', 'show']);

function isRatingQueryItem(value: unknown): value is RatingQueryItem {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const item = value as Record<string, unknown>;
  if (typeof item.key !== 'string' || item.key.trim() === '') {
    return false;
  }
  if (typeof item.title !== 'string') {
    return false;
  }
  if (
    item.type !== undefined &&
    (typeof item.type === 'string'
      ? !RATING_TYPES.has(item.type)
      : true)
  ) {
    return false;
  }

  return true;
}

function parseItems(body: unknown): RatingQueryItem[] | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const items = (body as RatingsBatchRequest).items;
  if (!Array.isArray(items)) {
    return null;
  }

  return items.slice(0, MAX_ITEMS_PER_REQUEST).filter(isRatingQueryItem);
}

export async function POST(request: NextRequest) {
  const authInfo = getAuthInfoFromCookie(request);
  if (!authInfo || !authInfo.username) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const items = parseItems(body);
  if (!items) {
    return NextResponse.json({ error: 'Invalid items' }, { status: 400 });
  }

  if (items.length === 0) {
    return NextResponse.json(
      { items: {} },
      { headers: { 'Cache-Control': 'private, max-age=300' } }
    );
  }

  try {
    const config = await getConfig();
    const siteConfig = config.SiteConfig;
    const providers = buildDefaultProviders({
      douban: siteConfig.ShowDoubanRating ?? true,
      imdb: siteConfig.ShowImdbRating ?? true,
      rt: siteConfig.ShowRtRating ?? true,
    });
    const itemsById = await resolveRatingsBatch(items, providers);
    return NextResponse.json(
      { items: itemsById },
      { headers: { 'Cache-Control': 'private, max-age=300' } }
    );
  } catch {
    return NextResponse.json(
      { error: '获取评分失败' },
      { status: 500 }
    );
  }
}