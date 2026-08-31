// 统一三源评分模型。前端只消费 RatingsBundle / ResolvedRating，不感知具体 provider。

export type RatingSource = 'douban' | 'imdb' | 'rt';

export interface ExternalIds {
  douban_id?: string;
  imdb_id?: string;
  rt_id?: string;
  rt_slug?: string;
}

export interface RatingEntry {
  source: RatingSource;
  label: string;
  value: number;
  scale: 10 | 100;
  votes?: number;
  kind?: 'user' | 'critic' | 'tomatometer' | 'popcornmeter';
  url?: string;
  updated_at: number;
}

export type RatingsBundle = Partial<Record<RatingSource, RatingEntry>>;

export interface RatingMatch {
  strategy: string;
  confidence: number;
}

export interface ResolvedRating {
  external_ids: ExternalIds;
  ratings: RatingsBundle;
  match: RatingMatch;
  stale?: boolean;
}

export interface RatingQueryItem {
  key: string;
  title: string;
  year?: string;
  type?: 'movie' | 'tv' | 'anime' | 'show';
  douban_id?: number | string;
  imdb_id?: string;
  rt_id?: string;
  rt_slug?: string;
}

export interface RatingsBatchRequest {
  items: RatingQueryItem[];
}

export interface RatingsBatchResponse {
  items: Record<string, ResolvedRating | undefined>;
}

export interface RatingProviderContext {
  item: RatingQueryItem;
  externalIds: ExternalIds;
}

export interface RatingProvider {
  readonly source: RatingSource;
  resolve(context: RatingProviderContext): Promise<RatingEntry | undefined>;
}