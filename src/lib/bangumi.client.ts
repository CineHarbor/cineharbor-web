'use client';

import type { BangumiCalendarData } from '@/lib/core/bangumi/addon-bangumi-client';
import {
  getAddonBangumiClient,
} from '@/lib/core/bangumi/addon-bangumi-source-factory';

export type { BangumiCalendarData };

export async function GetBangumiCalendarData(): Promise<BangumiCalendarData[]> {
  const data = await getAddonBangumiClient().calendar();
  return data.map((item) => ({
    ...item,
    items: item.items.filter((bangumiItem) => bangumiItem.images),
  }));
}
