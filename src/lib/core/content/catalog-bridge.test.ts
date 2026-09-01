import type { AddonMeta } from "@/lib/transport/addon-types";
import {
  metaToSearchResult,
  metasToSearchResults,
} from "./catalog-bridge";

const meta: AddonMeta = {
  id: "v:1",
  type: "movie",
  name: "测试片",
  poster: "http://example.test/p.jpg",
  year: "2024",
  description: "描述",
};

describe("catalog-bridge", () => {
  it("映射 meta → SearchResult 骨架", () => {
    const result = metaToSearchResult(meta, { source: "vod", sourceName: "VOD" });
    expect(result).toEqual({
      id: "v:1",
      title: "测试片",
      poster: "http://example.test/p.jpg",
      episodes: [],
      episodes_titles: [],
      source: "vod",
      source_name: "VOD",
      class: "movie",
      year: "2024",
      desc: "描述",
      type_name: "movie",
    });
  });

  it("缺省字段回退（poster/year/desc/type）", () => {
    const result = metaToSearchResult(
      { id: "x", type: "series", name: "n" },
      { source: "s", sourceName: "S" },
    );
    expect(result.poster).toBe("");
    expect(result.year).toBe("");
    expect(result.desc).toBeUndefined();
    expect(result.type_name).toBe("series");
    expect(result.episodes).toEqual([]);
  });

  it("批量映射", () => {
    const results = metasToSearchResults([meta, meta], {
      source: "vod",
      sourceName: "VOD",
    });
    expect(results).toHaveLength(2);
    expect(results[0].id).toBe("v:1");
    expect(results[1].id).toBe("v:1");
  });
});