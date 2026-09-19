import { WorkerLike, WorkerRpc, WorkerRpcOptions } from './worker-rpc';

/** Preserve the distinction between an absent IndexedDB key and an empty string. */
export class CoreStorageClient {
  private readonly rpc: WorkerRpc;
  constructor(worker: WorkerLike, options: WorkerRpcOptions = {}) {
    this.rpc = new WorkerRpc(worker, options);
  }
  async get(key: string): Promise<string | null> {
    const value = await this.rpc.request('storage_get', [key]);
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string')
      throw new Error('Invalid storage value: expected a string or null');
    return value;
  }
  async set(key: string, value: string): Promise<void> {
    await this.rpc.request('storage_set', [key, value]);
  }
  async remove(key: string): Promise<void> {
    await this.rpc.request('storage_remove', [key]);
  }
  dispose(): void {
    this.rpc.dispose();
  }
}
