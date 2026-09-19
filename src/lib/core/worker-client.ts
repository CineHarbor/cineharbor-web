import { WorkerLike, WorkerRpc, WorkerRpcOptions } from './worker-rpc';

export type { WorkerLike } from './worker-rpc';

/** Addon calls return JSON strings; storage uses its separate nullable adapter. */
export class CoreWorkerClient {
  private readonly rpc: WorkerRpc;
  constructor(worker: WorkerLike, options: WorkerRpcOptions = {}) {
    this.rpc = new WorkerRpc(worker, options);
  }
  async request(op: string, args: unknown[]): Promise<string> {
    const value = await this.rpc.request(op, args);
    if (typeof value !== 'string')
      throw new Error('Invalid core response: expected a string');
    return value;
  }
  dispose(): void {
    this.rpc.dispose();
  }
}
