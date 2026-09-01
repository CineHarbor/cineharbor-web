import {
  buildVodProxyKeyUrl,
  buildVodProxyM3u8Url,
  buildVodProxySegmentUrl,
} from "./proxy-url";

const KEY = "USE_ADDON_MEDIA_PROXY";

function setFlag(value: string | undefined): void {
  if (value === undefined) {
    delete process.env[KEY];
  } else {
    process.env[KEY] = value;
  }
}

describe("proxy-url 媒体代理切面开关", () => {
  afterEach(() => {
    delete process.env[KEY];
  });

  it("缺省（off）走原生 /api/proxy/vod/*", () => {
    setFlag(undefined);
    expect(
      buildVodProxyM3u8Url({ source: "s", url: "https://c.test/a.m3u8" })
    ).toContain("/api/proxy/vod/m3u8");
  });

  it("USE_ADDON_MEDIA_PROXY=true 走 addon /media/vod/*", () => {
    setFlag("true");
    expect(
      buildVodProxyM3u8Url({ source: "s", url: "https://c.test/a.m3u8" })
    ).toBe(
      "http://127.0.0.1:11473/media/vod/m3u8?source=s&url=https%3A%2F%2Fc.test%2Fa.m3u8"
    );
    expect(
      buildVodProxySegmentUrl({ source: "s", url: "https://c.test/1.ts" })
    ).toBe(
      "http://127.0.0.1:11473/media/vod/segment?source=s&url=https%3A%2F%2Fc.test%2F1.ts"
    );
    expect(
      buildVodProxyKeyUrl({ source: "s", url: "https://c.test/key.bin" })
    ).toBe(
      "http://127.0.0.1:11473/media/vod/key?source=s&url=https%3A%2F%2Fc.test%2Fkey.bin"
    );
  });

  it("非 'true' 值视为 off", () => {
    setFlag("1");
    expect(
      buildVodProxyM3u8Url({ source: "s", url: "https://c.test/a.m3u8" })
    ).toContain("/api/proxy/vod/m3u8");
  });
});