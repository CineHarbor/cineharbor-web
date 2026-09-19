import {
  getAddonLiveDataSource,
  USE_ADDON_LIVE,
} from "./addon-live-source-factory";

jest.mock("@/lib/core/bridge", () => ({
  loadCoreBridge: jest.fn(() => ({})),
}));

jest.mock("@/lib/transport/core-addon-client", () => ({
  CoreAddonClient: jest.fn(),
  getAddonProviderConfig: jest.fn(() => ({
    douban: "http://127.0.0.1:11471",
    vod: "http://127.0.0.1:11473",
    live: "http://127.0.0.1:11472",
  })),
}));

const { loadCoreBridge } = jest.requireMock("@/lib/core/bridge") as {
  loadCoreBridge: jest.Mock;
};
const { CoreAddonClient, getAddonProviderConfig } = jest.requireMock(
  "@/lib/transport/core-addon-client"
) as { CoreAddonClient: jest.Mock; getAddonProviderConfig: jest.Mock };

describe("addon-live-source-factory", () => {
  it("NEXT_PUBLIC_USE_ADDON_LIVE 未设置时默认 on", () => {
    expect(USE_ADDON_LIVE).toBe(true);
  });

  it("getAddonLiveDataSource 懒加载单例，仅首次 loadCoreBridge + 按 live base 构造", () => {
    const first = getAddonLiveDataSource();
    const second = getAddonLiveDataSource();

    expect(second).toBe(first);
    expect(loadCoreBridge).toHaveBeenCalledTimes(1);
    expect(getAddonProviderConfig).toHaveBeenCalledTimes(1);
    expect(CoreAddonClient).toHaveBeenCalledWith(
      {},
      "http://127.0.0.1:11472"
    );
  });
});