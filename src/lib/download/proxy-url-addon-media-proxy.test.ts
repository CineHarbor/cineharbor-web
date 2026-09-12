import {
  buildVodProxyKeyUrl,
  buildVodProxyM3u8Url,
  buildVodProxySegmentUrl,
  isVodProxyUrl,
} from "./proxy-url";

describe("proxy-url vod addon 媒体代理", () => {
  it("直连 addon /media/vod/*", () => {
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

  it("isVodProxyUrl 识别 addon 与遗留原生路径", () => {
    expect(
      isVodProxyUrl(
        "http://127.0.0.1:11473/media/vod/m3u8?source=s&url=https%3A%2F%2Fc.test%2Fa.m3u8"
      )
    ).toBe(true);
    expect(
      isVodProxyUrl(
        "/api/proxy/vod/m3u8?source=demo&url=https%3A%2F%2Fexample.com%2Findex.m3u8"
      )
    ).toBe(true);
  });
});
