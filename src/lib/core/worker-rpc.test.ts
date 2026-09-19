import { CoreStorageClient } from './storage-client';
import { CoreWorkerClient } from './worker-client';
import { WorkerLike, WorkerRpc } from './worker-rpc';

function fixture() {
  const worker: WorkerLike = {
    postMessage: jest.fn(),
    onmessage: null,
    terminate: jest.fn(),
  };
  const rpc = new WorkerRpc(worker, { timeoutMs: 50 });
  const reply = (data: unknown) => worker.onmessage?.({ data });
  return { worker, rpc, reply };
}

describe('bounded worker RPC lifecycle', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
  });

  it('rejects a timeout and ignores a late response without failing a newer call', async () => {
    const { rpc, reply } = fixture();
    const first = expect(rpc.request('manifest', [])).rejects.toThrow(
      'timed out'
    );
    jest.advanceTimersByTime(50);
    await first;
    const second = rpc.request('meta', []);
    reply({ id: 1, ok: true, value: 'late' });
    reply({ id: 2, ok: true, value: 'current' });
    await expect(second).resolves.toBe('current');
    rpc.dispose();
  });

  it('disposal rejects every pending call, terminates once and prevents new calls', async () => {
    const { rpc, worker } = fixture();
    const pending = [
      expect(rpc.request('a', [])).rejects.toThrow('disposed'),
      expect(rpc.request('b', [])).rejects.toThrow('disposed'),
    ];
    rpc.dispose();
    rpc.dispose();
    await Promise.all(pending);
    await expect(rpc.request('c', [])).rejects.toThrow('disposed');
    expect(worker.terminate).toHaveBeenCalledTimes(1);
    expect(worker.onmessage).toBeNull();
  });

  it.each(['onerror', 'onmessageerror'] as const)(
    'settles requests on %s and prevents use of a dead worker',
    async (event) => {
      const { rpc, worker } = fixture();
      const pending = expect(rpc.request('a', [])).rejects.toThrow(/worker/);
      worker[event]?.({ message: 'crashed' });
      await pending;
      await expect(rpc.request('b', [])).rejects.toThrow(/worker/);
      expect(worker.terminate).toHaveBeenCalledTimes(1);
    }
  );

  it('a malformed envelope rejects all pending calls instead of hanging', async () => {
    const { rpc, reply } = fixture();
    const pending = expect(rpc.request('a', [])).rejects.toThrow('Malformed');
    reply(null);
    await pending;
  });

  it('valid correlation with malformed status only rejects its own request', async () => {
    const { rpc, reply } = fixture();
    const first = expect(rpc.request('a', [])).rejects.toThrow('Malformed');
    const second = rpc.request('b', []);
    reply({ id: 1, ok: 'true' });
    reply({ id: 2, ok: true, value: 'ok' });
    await first;
    await expect(second).resolves.toBe('ok');
    rpc.dispose();
  });

  it('synchronous postMessage errors leave no timers or pending work', async () => {
    const { rpc, worker } = fixture();
    worker.postMessage = () => {
      throw new Error('clone failed');
    };
    await expect(rpc.request('a', [])).rejects.toThrow('clone failed');
    rpc.dispose();
  });

  it.each([0, -1, NaN, Infinity, 0.5, 2_147_483_648])(
    'rejects invalid timeout %s before attaching listeners',
    (timeoutMs) => {
      const worker: WorkerLike = { postMessage: jest.fn(), onmessage: null };
      expect(() => new WorkerRpc(worker, { timeoutMs })).toThrow('timeout');
      expect(worker.onmessage).toBeNull();
    }
  );

  it('addon and storage adapters validate response types and preserve empty strings', async () => {
    const worker: WorkerLike = { postMessage: jest.fn(), onmessage: null };
    const core = new CoreWorkerClient(worker);
    const bad = expect(core.request('catalog', [])).rejects.toThrow(
      'expected a string'
    );
    worker.onmessage?.({ data: { id: 1, ok: true, value: {} } });
    await bad;
    core.dispose();
    const store = new CoreStorageClient(worker);
    const empty = store.get('empty');
    worker.onmessage?.({ data: { id: 1, ok: true, value: '' } });
    await expect(empty).resolves.toBe('');
    const malformed = expect(store.get('bad')).rejects.toThrow(
      'Invalid storage'
    );
    worker.onmessage?.({ data: { id: 2, ok: true, value: 1 } });
    await malformed;
    store.dispose();
  });
});
