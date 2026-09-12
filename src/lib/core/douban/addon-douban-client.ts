//! 豆瓣标题搜索：standalone douban addon 的 catalog(search) → 页面 `DoubanItem`。
//!
//! addon 单次 catalog 对齐豆瓣一页（`skip` = start）；页面要 45 条时本客户端按 15 翻页合并去重。
//! 只打一次 `movie` catalog：addon 不按 type 过滤，movie/series 两目录会返回同一批混合结果。

import type {
  AddonCatalogResponse,
  AddonContentType,
  AddonMeta,
} from "@/lib/transport/addon-types";
import type { DoubanItem } from "@/lib/types";

export const DOUBAN_SEARCH_PAGE_SIZE = 15;
const SEARCH_CATALOG_ID = "search";
const DOUBAN_ID_PREFIX = "douban:";

/** 依赖倒置：只依赖 catalog，便于纯单测（`CoreAddonClient` 结构上满足）。 */
export interface DoubanAddonPort {
  catalog(
    type: AddonContentType,
    id: string,
    options?: { search?: string; skip?: number },
  ): Promise<AddonCatalogResponse>;
}

export function parseDoubanAddonId(id: string): string | null {
  const raw = id.startsWith(DOUBAN_ID_PREFIX)
    ? id.slice(DOUBAN_ID_PREFIX.length)
    : id;
  if (!raw || !/^\d+$/.test(raw)) {
    return null;
  }
  return raw;
}

export function metaToDoubanItem(meta: AddonMeta): DoubanItem | null {
  const id = parseDoubanAddonId(meta.id);
  if (!id) {
    return null;
  }
  return {
    id,
    title: meta.name,
    poster: meta.poster ?? "",
    rate: meta.rating ?? "",
    year: meta.year ?? "",
    playType: meta.type === "series" ? "tv" : "movie",
  };
}

export class AddonDoubanClient {
  constructor(private readonly addon: DoubanAddonPort) {}

  async search(
    query: string,
    options: { limit?: number; start?: number } = {},
  ): Promise<DoubanItem[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      throw new Error("query 参数不能为空");
    }

    const limit = Math.max(1, options.limit ?? DOUBAN_SEARCH_PAGE_SIZE);
    const start = Math.max(0, options.start ?? 0);
    const collected = new Map<string, DoubanItem>();
    let skip = start;

    while (collected.size < limit) {
      const response = await this.addon.catalog("movie", SEARCH_CATALOG_ID, {
        search: trimmed,
        skip,
      });
      const page = response.metas
        .map(metaToDoubanItem)
        .filter((item): item is DoubanItem => item !== null);

      if (page.length === 0) {
        break;
      }

      for (const item of page) {
        if (!collected.has(item.id)) {
          collected.set(item.id, item);
        }
        if (collected.size >= limit) {
          break;
        }
      }

      if (page.length < DOUBAN_SEARCH_PAGE_SIZE) {
        break;
      }
      skip += DOUBAN_SEARCH_PAGE_SIZE;
    }

    return Array.from(collected.values()).slice(0, limit);
  }
}
