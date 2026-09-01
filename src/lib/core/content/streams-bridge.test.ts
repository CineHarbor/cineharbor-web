import type { AddonMeta, AddonStream } from "@/lib/transport/addon-types";

import { buildDetail, streamsToEpisodes } from "./streams-bridge";

describe("streams-bridge", () => {
  it("streamsToEpisodes 映射 url + title/name/序号回退", () => {
    const streams: AddonStream[] = [
      { title: "第一集", url: "https://cdn/a1.m3u8" },
      { name: "EP2", url: "https://cdn/a2.m3u8" },
      { url: "https://cdn/a3.m3u8" },
    ];
    expect(streamsToEpisodes(streams)).toEqual({
      episodes: [
        "https://cdn/a1.m3u8",
        "https://cdn/a2.m3u8",
        "https://cdn/a3.m3u8",
      ],
      episodes_titles: ["第一集", "EP2", "第3集"],
    });
  });

  it("streamsToEpisodes 跳过无 url 的流（纯 infoHash）", () => {
    const streams: AddonStream[] = [
      { infoHash: "deadbeef" },
      { title: "A", url: "https://cdn/a.m3u8" },
    ];
    expect(streamsToEpisodes(streams)).toEqual({
      episodes: ["https://cdn/a.m3u8"],
      episodes_titles: ["A"],
    });
  });

  it("buildDetail 合成 catalog-bridge 骨架 + 剧集流", () => {
    const meta: AddonMeta = {
      id: "vod:site:123",
      type: "series",
      name: "某剧",
      poster: "https://img/x.jpg",
      description: "简介",
      year: "2026",
    };
    const streams: AddonStream[] = [{ title: "第1集", url: "https://cdn/1.m3u8" }];
    const detail = buildDetail(meta, streams, {
      source: "vod",
      sourceName: "点播",
    });

    expect(detail).toEqual({
      id: "vod:site:123",
      title: "某剧",
      poster: "https://img/x.jpg",
      episodes: ["https://cdn/1.m3u8"],
      episodes_titles: ["第1集"],
      source: "vod",
      source_name: "点播",
      class: "series",
      year: "2026",
      desc: "简介",
      type_name: "series",
    });
  });
});