import { AddonLiveClient } from "./addon-live-client";

function makePort() {
  const port = {
    manifest: jest.fn(),
    catalog: jest.fn(),
    streams: jest.fn(),
  };
  port.manifest.mockResolvedValue({
    catalogs: [
      { id: "cctv", name: "央视", type: "tv" },
      { id: "hunan", name: "卫视", type: "tv" },
    ],
  });
  port.catalog.mockResolvedValue({
    metas: [
      {
        id: "live:cctv:0",
        type: "tv",
        name: "CCTV-1 综合",
        poster: "https://logo.test/cctv1.png",
        description: "央视",
      },
      { id: "live:cctv:1", type: "tv", name: "CCTV-5 体育" },
    ],
  });
  port.streams.mockResolvedValue({
    streams: [
      {
        name: "CCTV-1 综合",
        url: "http://127.0.0.1:11472/media/live/m3u8?cineharbor-source=cctv&url=test",
      },
    ],
  });
  return port;
}

describe("addon-live-client", () => {
  it("listSources 读 manifest.catalogs", async () => {
    const port = makePort();
    const client = new AddonLiveClient(port);
    const sources = await client.listSources();

    expect(sources).toEqual([
      { key: "cctv", name: "央视" },
      { key: "hunan", name: "卫视" },
    ]);
    expect(port.manifest).toHaveBeenCalled();
  });

  it("listChannels 按源 key 取频道并映射（缺省字段回退）", async () => {
    const port = makePort();
    const client = new AddonLiveClient(port);
    const channels = await client.listChannels("cctv");

    expect(channels).toHaveLength(2);
    expect(channels[0]).toEqual({
      id: "live:cctv:0",
      name: "CCTV-1 综合",
      logo: "https://logo.test/cctv1.png",
      group: "央视",
      tvgId: "",
    });
    expect(channels[1]).toEqual({
      id: "live:cctv:1",
      name: "CCTV-5 体育",
      logo: "",
      group: "",
      tvgId: "",
    });
    expect(port.catalog).toHaveBeenCalledWith("tv", "cctv");
  });

  it("getStreamUrl 返回第一条已转链流 url", async () => {
    const port = makePort();
    const client = new AddonLiveClient(port);
    const url = await client.getStreamUrl("live:cctv:0");

    expect(url).toContain("/media/live/m3u8");
    expect(port.streams).toHaveBeenCalledWith("tv", "live:cctv:0");
  });

  it("getStreamUrl 无流时抛错", async () => {
    const port = makePort();
    port.streams.mockResolvedValue({ streams: [] });
    const client = new AddonLiveClient(port);

    await expect(client.getStreamUrl("live:cctv:5")).rejects.toThrow("无播放流");
  });
});