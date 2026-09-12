import type { AddonMeta } from "@/lib/transport/addon-types";

import {
  AddonBangumiClient,
  metaToBangumiItem,
  metasToBangumiCalendar,
  parseBangumiAddonId,
  type BangumiAddonPort,
} from "./addon-bangumi-client";

function meta(partial: Partial<AddonMeta> & Pick<AddonMeta, "id" | "name">): AddonMeta {
  return {
    type: "series",
    ...partial,
  };
}

describe("parseBangumiAddonId / metaToBangumiItem", () => {
  it("剥 bangumi: 前缀", () => {
    expect(parseBangumiAddonId("bangumi:40748")).toBe(40748);
    expect(parseBangumiAddonId("40748")).toBe(40748);
    expect(parseBangumiAddonId("bangumi:x")).toBeNull();
  });

  it("中文名为 name，原名进 description", () => {
    expect(
      metaToBangumiItem(
        meta({
          id: "bangumi:40748",
          name: "葬送的芙莉莲",
          description: "Sousou no Frieren",
          poster: "https://lain.bgm.tv/frieren.jpg",
          releaseInfo: "2023-09-29",
          rating: "9",
          genres: ["Fri"],
        }),
      ),
    ).toEqual({
      id: 40748,
      name: "Sousou no Frieren",
      name_cn: "葬送的芙莉莲",
      rating: { score: 9 },
      air_date: "2023-09-29",
      images: {
        large: "https://lain.bgm.tv/frieren.jpg",
        common: "https://lain.bgm.tv/frieren.jpg",
        medium: "https://lain.bgm.tv/frieren.jpg",
        small: "https://lain.bgm.tv/frieren.jpg",
        grid: "https://lain.bgm.tv/frieren.jpg",
      },
    });
  });
});

describe("metasToBangumiCalendar", () => {
  it("按 weekday 分到一周 7 天，空天保留", () => {
    const days = metasToBangumiCalendar([
      meta({
        id: "bangumi:1",
        name: "A",
        poster: "a.jpg",
        genres: ["Fri"],
      }),
    ]);
    expect(days).toHaveLength(7);
    expect(days.map((day) => day.weekday.en)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(days[4].items).toHaveLength(1);
    expect(days[0].items).toEqual([]);
  });

  it("无图条目丢弃（对齐原生 filter）", () => {
    const days = metasToBangumiCalendar([
      meta({ id: "bangumi:1", name: "无图", genres: ["Mon"] }),
    ]);
    expect(days[0].items).toEqual([]);
  });
});

describe("AddonBangumiClient.calendar", () => {
  it("打 series/calendar 并重组", async () => {
    const port: BangumiAddonPort & { catalog: jest.Mock } = {
      catalog: jest.fn().mockResolvedValue({
        metas: [
          meta({
            id: "bangumi:40748",
            name: "葬送的芙莉莲",
            poster: "p.jpg",
            genres: ["Fri"],
          }),
        ],
      }),
    };
    const client = new AddonBangumiClient(port);
    const days = await client.calendar();

    expect(port.catalog).toHaveBeenCalledWith("series", "calendar");
    expect(days[4].items[0].id).toBe(40748);
  });
});
