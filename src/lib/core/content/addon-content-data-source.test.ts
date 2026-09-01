import type { AddonContentType } from "@/lib/transport/addon-types";

import {
  AddonContentDataSourceImpl,
  type ContentAddonPort,
} from "./addon-content-data-source";

function makePort(): ContentAddonPort & {
  catalog: jest.Mock;
  meta: jest.Mock;
  streams: jest.Mock;
} {
  const port = {
    catalog: jest.fn(),
    meta: jest.fn(),
    streams: jest.fn(),
  } as ContentAddonPort & {
    catalog: jest.Mock;
    meta: jest.Mock;
    streams: jest.Mock;
  };

  port.catalog.mockImplementation(
    (type: AddonContentType, id: string, _options?: unknown) => {
      if (type === "movie") {
        return Promise.resolve({
          metas: [
            { id: "vod:m:1", type: "movie", name: "某电影", poster: "m.jpg", year: "2024" },
          ],
        });
      }
      return Promise.resolve({
        metas: [
          { id: "vod:s:2", type: "series", name: "某剧", poster: "s.jpg", year: "2026", description: "剧简介" },
        ],
      });
    },
  );
  port.meta.mockResolvedValue({
    meta: { id: "vod:s:2", type: "series", name: "某剧", year: "2026", description: "剧简介" },
  });
  port.streams.mockResolvedValue({
    streams: [
      { title: "第1集", url: "https://cdn/1.m3u8" },
      { title: "第2集", url: "https://cdn/2.m3u8" },
    ],
  });
  return port;
}

const OPTS = { source: "vod", sourceName: "点播" };

describe("addon-content-data-source", () => {
  it("search 合并 movie+series catalog，无剧集流", async () => {
    const port = makePort();
    const dataSource = new AddonContentDataSourceImpl(port, OPTS);
    const results = await dataSource.search("星际", 0);

    expect(results).toHaveLength(2);
    // 复合 id 还原为原生形状：id=vid、source=站点 key。
    expect(results[0]).toMatchObject({ id: "1", source: "m", source_name: "m" });
    expect(results[1]).toMatchObject({ id: "2", source: "s", source_name: "s" });
    expect(results.every((r) => r.episodes.length === 0)).toBe(true);
    expect(port.catalog).toHaveBeenCalledWith("movie", "search", { search: "星际", skip: 0 });
    expect(port.catalog).toHaveBeenCalledWith("series", "search", { search: "星际", skip: 0 });
  });

  it("detail 合成 meta+stream（buildDetail）", async () => {
    const port = makePort();
    const dataSource = new AddonContentDataSourceImpl(port, OPTS);
    const detail = await dataSource.detail("series", "vod:s:2");

    expect(detail).not.toBeNull();
    expect(detail?.id).toBe("2");
    expect(detail?.source).toBe("s");
    expect(detail?.episodes).toEqual(["https://cdn/1.m3u8", "https://cdn/2.m3u8"]);
    expect(detail?.episodes_titles).toEqual(["第1集", "第2集"]);
    expect(port.meta).toHaveBeenCalledWith("series", "vod:s:2");
    expect(port.streams).toHaveBeenCalledWith("series", "vod:s:2");
  });
});