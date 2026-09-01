import type { CoreBridge } from "@/lib/core/bridge";
import {
  CoreAddonClient,
  getAddonProviderConfig,
} from "./core-addon-client";

const manifestJson = JSON.stringify({
  id: "vod",
  version: "1.0.0",
  name: "VOD",
  types: ["movie", "series"],
  resources: ["catalog", "meta", "stream"],
  catalogs: [{ type: "movie", id: "top", name: "Top", extra: ["search"] }],
});
const catalogJson = JSON.stringify({
  metas: [{ id: "v:1", type: "movie", name: "示例" }],
});
const metaJson = JSON.stringify({
  meta: { id: "v:1", type: "movie", name: "示例" },
});
const streamsJson = JSON.stringify({
  streams: [{ name: "线路1", url: "http://x/" }],
});

function makeBridge(overrides: Partial<CoreBridge> = {}): CoreBridge {
  return {
    coreVersion: async () => "0.1.0",
    addonManifestJson: async () => manifestJson,
    addonCatalogJson: async () => catalogJson,
    addonMetaJson: async () => metaJson,
    addonStreamsJson: async () => streamsJson,
    ...overrides,
  };
}

describe("CoreAddonClient", () => {
  it("解析 manifest", async () => {
    const client = new CoreAddonClient(makeBridge(), "http://127.0.0.1:11473/");
    const manifest = await client.manifest();
    expect(manifest.id).toBe("vod");
    expect(manifest.catalogs).toEqual([
      { type: "movie", id: "top", name: "Top", extra: ["search"] },
    ]);
  });

  it("catalog 透传 search 到 bridge", async () => {
    const calls: unknown[][] = [];
    const bridge = makeBridge({
      addonCatalogJson: async (...args) => {
        calls.push(args);
        return catalogJson;
      },
    });
    const client = new CoreAddonClient(bridge, "http://x");
    const result = await client.catalog("movie", "search", { search: "测试" });
    expect(result.metas).toHaveLength(1);
    expect(calls).toEqual([
      ["http://x", "movie", "search", { search: "测试" }],
    ]);
  });

  it("空响应抛错", async () => {
    const client = new CoreAddonClient(
      makeBridge({ addonManifestJson: async () => "" }),
      "http://x",
    );
    await expect(client.manifest()).rejects.toThrow(/空响应/);
  });

  it("非法 JSON 抛错", async () => {
    const client = new CoreAddonClient(
      makeBridge({ addonStreamsJson: async () => "not-json" }),
      "http://x",
    );
    await expect(client.streams("movie", "v:1")).rejects.toThrow(/非法 JSON/);
  });

  it("provider 默认端点", () => {
    expect(getAddonProviderConfig()).toEqual({
      douban: "http://127.0.0.1:11471",
      vod: "http://127.0.0.1:11473",
      live: "http://127.0.0.1:11472",
    });
  });
});