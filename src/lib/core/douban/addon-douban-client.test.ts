import type { AddonMeta } from "@/lib/transport/addon-types";

import {
  type DoubanAddonPort,
  AddonDoubanClient,
  DOUBAN_SEARCH_PAGE_SIZE,
  metaToDoubanItem,
  parseDoubanAddonId,
} from "./addon-douban-client";

function meta(partial: Partial<AddonMeta> & Pick<AddonMeta, "id" | "name">): AddonMeta {
  return {
    type: "movie",
    ...partial,
  };
}

function makePort(pages: AddonMeta[][]): DoubanAddonPort & { catalog: jest.Mock } {
  const port = { catalog: jest.fn() };
  port.catalog.mockImplementation(
    (_type: string, _id: string, options?: { skip?: number }) => {
      const skip = options?.skip ?? 0;
      const index = skip / DOUBAN_SEARCH_PAGE_SIZE;
      return Promise.resolve({ metas: pages[index] ?? [] });
    },
  );
  return port;
}

describe("parseDoubanAddonId / metaToDoubanItem", () => {
  it("剥 douban: 前缀", () => {
    expect(parseDoubanAddonId("douban:3541415")).toBe("3541415");
    expect(parseDoubanAddonId("3541415")).toBe("3541415");
    expect(parseDoubanAddonId("douban:abc")).toBeNull();
    expect(parseDoubanAddonId("vod:1")).toBeNull();
  });

  it("映射评分、年份、剧集类型", () => {
    expect(
      metaToDoubanItem(
        meta({
          id: "douban:3541415",
          name: "星际穿越 Interstellar",
          poster: "p.jpg",
          year: "2014",
          rating: "9.4",
          type: "movie",
        }),
      ),
    ).toEqual({
      id: "3541415",
      title: "星际穿越 Interstellar",
      poster: "p.jpg",
      rate: "9.4",
      year: "2014",
      playType: "movie",
    });

    expect(
      metaToDoubanItem(
        meta({
          id: "douban:1",
          name: "某剧",
          type: "series",
        }),
      ),
    ).toMatchObject({ playType: "tv", rate: "", year: "", poster: "" });
  });
});

describe("AddonDoubanClient.search", () => {
  it("空 query 抛错", async () => {
    const client = new AddonDoubanClient(makePort([]));
    await expect(client.search("  ")).rejects.toThrow("query 参数不能为空");
  });

  it("只打 movie catalog，映射一页", async () => {
    const port = makePort([
      [
        meta({
          id: "douban:3541415",
          name: "星际穿越 Interstellar",
          rating: "9.4",
          year: "2014",
        }),
      ],
    ]);
    const client = new AddonDoubanClient(port);
    const list = await client.search("星际穿越");

    expect(list).toEqual([
      {
        id: "3541415",
        title: "星际穿越 Interstellar",
        poster: "",
        rate: "9.4",
        year: "2014",
        playType: "movie",
      },
    ]);
    expect(port.catalog).toHaveBeenCalledTimes(1);
    expect(port.catalog).toHaveBeenCalledWith("movie", "search", {
      search: "星际穿越",
      skip: 0,
    });
  });

  it("按 15 翻页凑满 limit，并按 id 去重", async () => {
    const page1 = Array.from({ length: 15 }, (_, i) =>
      meta({ id: `douban:${i + 1}`, name: `t${i + 1}` }),
    );
    const page2 = [
      meta({ id: "douban:1", name: "dup" }),
      ...Array.from({ length: 14 }, (_, i) =>
        meta({ id: `douban:${i + 16}`, name: `t${i + 16}` }),
      ),
    ];
    const port = makePort([page1, page2]);
    const client = new AddonDoubanClient(port);
    const list = await client.search("q", { limit: 20 });

    expect(list).toHaveLength(20);
    expect(list[0].id).toBe("1");
    expect(list[15].id).toBe("16");
    expect(port.catalog).toHaveBeenCalledTimes(2);
    expect(port.catalog).toHaveBeenNthCalledWith(2, "movie", "search", {
      search: "q",
      skip: 15,
    });
  });

  it("空页停止翻页", async () => {
    const port = makePort([[]]);
    const client = new AddonDoubanClient(port);
    await expect(client.search("无结果")).resolves.toEqual([]);
    expect(port.catalog).toHaveBeenCalledTimes(1);
  });
});
