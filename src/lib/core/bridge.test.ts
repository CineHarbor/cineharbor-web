import { loadCoreBridge, normalizeAddonBaseUrl } from "./bridge";
import { WorkerLike } from "./worker-client";

function fakeWorkerFactory() {
  const sent: unknown[] = [];
  const worker = {
    postMessage: (message: unknown) => {
      sent.push(message);
    },
    onmessage: null,
  } as unknown as WorkerLike;
  return { worker, sent };
}

describe("core bridge", () => {
  it("规范 addon base url（去尾斜杠）", () => {
    expect(normalizeAddonBaseUrl("http://127.0.0.1:11473/")).toBe(
      "http://127.0.0.1:11473",
    );
    expect(normalizeAddonBaseUrl("http://x/")).toBe("http://x");
    expect(normalizeAddonBaseUrl("http://x")).toBe("http://x");
    expect(normalizeAddonBaseUrl("http://x///")).toBe("http://x");
  });

  it("catalog 无 search → extra=null", () => {
    const { worker, sent } = fakeWorkerFactory();
    const bridge = loadCoreBridge(() => worker);
    void bridge.addonCatalogJson("http://x/", "movie", "top");
    expect(sent).toHaveLength(1);
    const request = sent[0] as { op: string; args: unknown[] };
    expect(request.op).toBe("catalog");
    expect(request.args).toEqual(["http://x", "movie", "top", null, null, null]);
  });

  it("catalog 有 search → extra=('search', q)", () => {
    const { worker, sent } = fakeWorkerFactory();
    const bridge = loadCoreBridge(() => worker);
    void bridge.addonCatalogJson("http://x", "movie", "top", {
      search: "测试",
      skip: 2,
    });
    const request = sent[0] as { op: string; args: unknown[] };
    expect(request.args).toEqual([
      "http://x",
      "movie",
      "top",
      "search",
      "测试",
      2,
    ]);
  });
});