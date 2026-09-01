import {
  buildLiveAddonProxyKeyUrl,
  buildLiveAddonProxyM3u8Url,
  buildLiveAddonProxySegmentUrl,
  buildVodAddonProxyKeyUrl,
  buildVodAddonProxyM3u8Url,
  buildVodAddonProxySegmentUrl,
} from "./addon-media-proxy";

const VOD_BASE = "http://127.0.0.1:11473";
const LIVE_BASE = "http://127.0.0.1:11472";

describe("addon-media-proxy", () => {
  it("vod m3u8/segment/key 直连 addon `/media/vod/*`", () => {
    expect(
      buildVodAddonProxyM3u8Url(VOD_BASE, "src", "https://cdn.test/a.m3u8")
    ).toBe(
      "http://127.0.0.1:11473/media/vod/m3u8?source=src&url=https%3A%2F%2Fcdn.test%2Fa.m3u8"
    );
    expect(
      buildVodAddonProxySegmentUrl(VOD_BASE, "src", "https://cdn.test/1.ts")
    ).toBe(
      "http://127.0.0.1:11473/media/vod/segment?source=src&url=https%3A%2F%2Fcdn.test%2F1.ts"
    );
    expect(
      buildVodAddonProxyKeyUrl(VOD_BASE, "src", "https://cdn.test/key.bin")
    ).toBe(
      "http://127.0.0.1:11473/media/vod/key?source=src&url=https%3A%2F%2Fcdn.test%2Fkey.bin"
    );
  });

  it("live m3u8 缺省无 allowCORS，显式 true 追加 `allowCORS=true`", () => {
    expect(
      buildLiveAddonProxyM3u8Url(
        LIVE_BASE,
        "m3u8",
        "https://cdn.test/live.m3u8"
      )
    ).toBe(
      "http://127.0.0.1:11472/media/live/m3u8?cineharbor-source=m3u8&url=https%3A%2F%2Fcdn.test%2Flive.m3u8"
    );
    expect(
      buildLiveAddonProxyM3u8Url(
        LIVE_BASE,
        "m3u8",
        "https://cdn.test/live.m3u8",
        true
      )
    ).toBe(
      "http://127.0.0.1:11472/media/live/m3u8?cineharbor-source=m3u8&url=https%3A%2F%2Fcdn.test%2Flive.m3u8&allowCORS=true"
    );
  });

  it("live segment/key 直连 addon `/media/live/*`", () => {
    expect(
      buildLiveAddonProxySegmentUrl(LIVE_BASE, "m3u8", "https://cdn.test/1.ts")
    ).toBe(
      "http://127.0.0.1:11472/media/live/segment?cineharbor-source=m3u8&url=https%3A%2F%2Fcdn.test%2F1.ts"
    );
    expect(
      buildLiveAddonProxyKeyUrl(LIVE_BASE, "m3u8", "https://cdn.test/k.bin")
    ).toBe(
      "http://127.0.0.1:11472/media/live/key?cineharbor-source=m3u8&url=https%3A%2F%2Fcdn.test%2Fk.bin"
    );
  });

  it("base url 末尾斜杠归一", () => {
    expect(
      buildVodAddonProxyKeyUrl("http://addon/", "s", "https://c.test/k")
    ).toBe("http://addon/media/vod/key?source=s&url=https%3A%2F%2Fc.test%2Fk");
  });
});