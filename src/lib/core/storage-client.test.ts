import { CoreStorageClient } from './storage-client';
import type { WorkerLike } from './worker-client';

function emit(worker: WorkerLike, event: { data: unknown }) {
  if (!worker.onmessage)
    throw new Error('Client did not register its message handler');
  worker.onmessage(event);
}

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

describe('CoreStorageClient', () => {
  it('get 缺键回 null', async () => {
    const { worker, sent } = fakeWorker();
    const client = new CoreStorageClient(worker);

    const pending = client.get('k');
    const request = sent[0] as { id: number; op: string; args: unknown[] };
    expect(request).toMatchObject({ op: 'storage_get', args: ['k'] });

    emit(worker, { data: { id: request.id, ok: true, value: null } });
    await expect(pending).resolves.toBeNull();
  });

  it('set 透传键值，get 回值', async () => {
    const { worker, sent } = fakeWorker();
    const client = new CoreStorageClient(worker);

    const write = client.set('k', 'v1');
    expect(sent[0]).toMatchObject({ op: 'storage_set', args: ['k', 'v1'] });
    emit(worker, { data: { id: (sent[0] as { id: number }).id, ok: true } });
    await write;

    const pending = client.get('k');
    const request = sent[1] as { id: number };
    emit(worker, { data: { id: request.id, ok: true, value: 'v1' } });
    await expect(pending).resolves.toBe('v1');
  });

  it('回包错误 reject', async () => {
    const { worker, sent } = fakeWorker();
    const client = new CoreStorageClient(worker);

    const pending = client.get('k');
    const request = sent[0] as { id: number };
    emit(worker, { data: { id: request.id, ok: false, error: 'boom' } });
    await expect(pending).rejects.toThrow('boom');
  });
});
