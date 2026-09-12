//! 首页/豆瓣「每日放送」：bangumi addon catalog(calendar) → 页面 `BangumiCalendarData[]`。
//!
//! addon 把 7 天摊平为 metas：`genres[0]` = weekday.en，`name` = 中文名，
//! `description` = 原名，`releaseInfo` = air_date，`rating` = 评分。
//! 本客户端按星期重组，并补齐空的一周（豆瓣页选没条目的星期也不能找不到那天）。

import type {
  AddonCatalogResponse,
  AddonContentType,
  AddonMeta,
} from "@/lib/transport/addon-types";

export interface BangumiCalendarData {
  weekday: {
    en: string;
  };
  items: {
    id: number;
    name: string;
    name_cn: string;
    rating: {
      score: number;
    };
    air_date: string;
    images: {
      large: string;
      common: string;
      medium: string;
      small: string;
      grid: string;
    };
  }[];
}

export const BANGUMI_WEEKDAYS = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
] as const;

const CALENDAR_CATALOG_ID = "calendar";
const BANGUMI_ID_PREFIX = "bangumi:";

export interface BangumiAddonPort {
  catalog(
    type: AddonContentType,
    id: string,
    options?: { search?: string; skip?: number },
  ): Promise<AddonCatalogResponse>;
}

export function parseBangumiAddonId(id: string): number | null {
  const raw = id.startsWith(BANGUMI_ID_PREFIX)
    ? id.slice(BANGUMI_ID_PREFIX.length)
    : id;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function emptyImages(): BangumiCalendarData["items"][number]["images"] {
  return {
    large: "",
    common: "",
    medium: "",
    small: "",
    grid: "",
  };
}

export function metaToBangumiItem(
  meta: AddonMeta,
): BangumiCalendarData["items"][number] | null {
  const id = parseBangumiAddonId(meta.id);
  if (id == null) {
    return null;
  }
  const poster = meta.poster ?? "";
  const images = poster
    ? {
        large: poster,
        common: poster,
        medium: poster,
        small: poster,
        grid: poster,
      }
    : emptyImages();
  const score = Number.parseFloat(meta.rating ?? "");
  return {
    id,
    name: meta.description?.trim() || meta.name,
    name_cn: meta.name,
    rating: {
      score: Number.isFinite(score) && score > 0 ? score : 0,
    },
    air_date: meta.releaseInfo ?? meta.year ?? "",
    images,
  };
}

function emptyWeek(): BangumiCalendarData[] {
  return BANGUMI_WEEKDAYS.map((en) => ({
    weekday: { en },
    items: [],
  }));
}

export function metasToBangumiCalendar(metas: AddonMeta[]): BangumiCalendarData[] {
  const days = emptyWeek();
  for (const meta of metas) {
    const item = metaToBangumiItem(meta);
    if (!item) {
      continue;
    }
    if (!item.images.large && !item.images.common) {
      continue;
    }
    const weekday = meta.genres?.[0];
    const day = days.find((entry) => entry.weekday.en === weekday);
    if (day) {
      day.items.push(item);
    }
  }
  return days;
}

export class AddonBangumiClient {
  constructor(private readonly addon: BangumiAddonPort) {}

  async calendar(): Promise<BangumiCalendarData[]> {
    const response = await this.addon.catalog("series", CALENDAR_CATALOG_ID);
    return metasToBangumiCalendar(response.metas);
  }
}
