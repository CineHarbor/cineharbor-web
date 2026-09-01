import { CoreWorkerClient, WorkerLike } from "./worker-client";

function fakeWorker() {
  const sent: unknown[] = [];
  const worker = {
    postMessage: (message: unknown) => {
      sent.push(message);
    },
    onmessage: null,
    terminate: () => undefined,
  } as unknown as WorkerLike;
  return { worker, sent };
}

describe("CoreWorkerClient", () => {
  it("post 请求并在对应 id 回包时 resolve", async () => {
    const { worker, sent } = fakeWorker();
    const client = new CoreWorkerClient(worker);

    const pending = client.request("manifest", ["http://x"]);
    expect(sent).toHaveLength(1);
    const request = sent[0] as { id: number; op: string; args: unknown[] };
    expect(request.op).toBe("manifest");
    expect(request.args).toEqual(["http://x"]);

    worker.onmessage!({ data: { id: request.id, ok: true, value: '{"id":"m"}' } });
    await expect(pending).resolves.toBe('{"id":"m"}');
  });

  it("回包错误时 reject", async () => {
    const { worker, sent } = fakeWorker();
    const client = new CoreWorkerClient(worker);

    const pending = client.request("meta", []);
    const request = sent[0] as { id: number };
    worker.onmessage!({ data: { id: request.id, ok: false, error: "boom" } });
    await expect(pending).rejects.toThrow("boom");
  });

  it("多个请求按 id 分派", async () => {
    const { worker, sent } = fakeWorker();
    const client = new CoreWorkerClient(worker);

    const a = client.request("a", []);
    const b = client.request("b", []);
    const ra = sent[0] as { id: number };
    const rb = sent[1] as { id: number };

    worker.onmessage!({ data: { id: rb.id, ok: true, value: "B" } });
    worker.onmessage!({ data: { id: ra.id, ok: true, value: "A" } });
    await expect(a).resolves.toBe("A");
    await expect(b).resolves.toBe("B");
  });
});