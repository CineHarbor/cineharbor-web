import { AddonLiveClient } from "./addon-live-client";
import { AddonLiveDataSourceImpl } from "./addon-live-source";

function makePort() {
  const port = {
    manifest: jest.fn(),
    catalog: jest.fn(),
    streams: jest.fn(),
  };
  port.manifest.mockResolvedValue({
    catalogs: [{ id: "cctv", name: "央视", type: "tv" }],
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
  port.streams.mockImplementation((_type: string, id: string) => {
    if (id === "live:cctv:0") {
      return Promise.resolve({
        streams: [{ url: "http://127.0.0.1:11472/media/live/m3u8?cineharbor-source=cctv&url=a" }],
      });
    }
    return Promise.resolve({ streams: [] });
  });
  return port;
}

describe("addon-live-source", () => {
  it("listSources 映射原生 LiveSource（url 置空，from=config）", async () => {
    const client = new AddonLiveClient(makePort());
    const dataSource = new AddonLiveDataSourceImpl(client);
    const sources = await dataSource.listSources();

    expect(sources).toEqual([
      { key: "cctv", name: "央视", url: "", from: "config" },
    ]);
  });

  it("listChannels 前缀已转链流 url，group 缺省回退", async () => {
    const client = new AddonLiveClient(makePort());
    const dataSource = new AddonLiveDataSourceImpl(client);
    const channels = await dataSource.listChannels("cctv");

    expect(channels).toHaveLength(2);
    expect(channels[0]).toEqual({
      id: "live:cctv:0",
      tvgId: "",
      name: "CCTV-1 综合",
      logo: "https://logo.test/cctv1.png",
      group: "央视",
      url: "http://127.0.0.1:11472/media/live/m3u8?cineharbor-source=cctv&url=a",
    });
    expect(channels[1].url).toBe("");
    expect(channels[1].group).toBe("其他");
  });
});