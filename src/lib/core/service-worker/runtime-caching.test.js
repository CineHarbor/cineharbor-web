const { buildRuntimeCaching } = require("./runtime-caching");

const APP_ORIGIN = "https://app.test";
const isSameOrigin = (url) => url.origin === APP_ORIGIN;

function match(entry, urlString) {
  return entry.urlPattern({ url: new URL(urlString) });
}

function findEntry(entries, cacheName) {
  return entries.find((entry) => entry?.options?.cacheName === cacheName);
}

describe("runtime-caching（薄客户端 SW）", () => {
  const entries = buildRuntimeCaching(isSameOrigin);

  it("wasm core 同源 CacheFirst 固化（/core-worker.js + /wasm/*）", () => {
    const entry = findEntry(entries, "core-wasm");
    expect(entry).toBeTruthy();
    expect(entry.handler).toBe("CacheFirst");
    expect(match(entry, `${APP_ORIGIN}/core-worker.js`)).toBe(true);
    expect(
      match(entry, `${APP_ORIGIN}/wasm/cineharbor_core_web_bg.wasm`)
    ).toBe(true);
    expect(match(entry, "https://other.test/wasm/x.wasm")).toBe(false);
    expect(match(entry, `${APP_ORIGIN}/api/search`)).toBe(false);
  });

  it("addon 元数据跨源 SWR（manifest/catalog/meta，不含 /media/*）", () => {
    const entry = findEntry(entries, "addon-meta");
    expect(entry).toBeTruthy();
    expect(entry.handler).toBe("StaleWhileRevalidate");
    expect(match(entry, "http://127.0.0.1:11472/manifest.json")).toBe(true);
    expect(match(entry, "http://127.0.0.1:11472/catalog/tv/channels.json")).toBe(
      true
    );
    expect(match(entry, "http://127.0.0.1:11473/meta/movie/x.json")).toBe(true);
    expect(match(entry, "http://127.0.0.1:11472/media/live/m3u8?x=1")).toBe(
      false
    );
  });

  it("原生 /api 仅同源缓存，排除 auth 与 proxy/vod，跨源不回退", () => {
    const entry = findEntry(entries, "apis");
    expect(entry).toBeTruthy();
    expect(match(entry, `${APP_ORIGIN}/api/search?q=x`)).toBe(true);
    expect(match(entry, `${APP_ORIGIN}/api/auth/login`)).toBe(false);
    expect(match(entry, `${APP_ORIGIN}/api/proxy/vod/m3u8?url=x`)).toBe(false);
    expect(match(entry, "http://other.test/api/search")).toBe(false);
  });
});