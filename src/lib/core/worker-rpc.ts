/** Bounded RPC transport shared by addon and IndexedDB workers. */
export interface WorkerLike {
  postMessage(message: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror?: ((event: { message?: string }) => void) | null;
  onmessageerror?: ((event: unknown) => void) | null;
  terminate?(): void;
}

export interface WorkerRpcOptions {
  timeoutMs?: number;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class WorkerRpc {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly timeoutMs: number;
  private terminalError: Error | null = null;

  constructor(
    private readonly worker: WorkerLike,
    options: WorkerRpcOptions = {}
  ) {
    this.timeoutMs = options.timeoutMs ?? 30_000;
    if (
      !Number.isSafeInteger(this.timeoutMs) ||
      this.timeoutMs <= 0 ||
      this.timeoutMs > 2_147_483_647
    ) {
      throw new Error('Worker RPC timeout must be a positive bounded integer');
    }
    worker.onmessage = (event) => this.handle(event.data);
    worker.onerror = () =>
      this.close(new Error('Core worker failed; reload to retry'));
    worker.onmessageerror = () =>
      this.close(new Error('Invalid core worker response; reload to retry'));
  }

  request(op: string, args: unknown[]): Promise<unknown> {
    if (this.terminalError) return Promise.reject(this.terminalError);
    return new Promise((resolve, reject) => {
      const id = this.nextId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        // A slow provider must not hold other providers or storage requests open.
        reject(new Error('Core worker request timed out; please retry'));
      }, this.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.worker.postMessage({ id, op, args });
      } catch (error) {
        this.take(id)?.reject(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    });
  }

  dispose(): void {
    this.close(new Error('Core worker client disposed'));
  }

  private take(id: number): Pending | undefined {
    const pending = this.pending.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      this.pending.delete(id);
    }
    return pending;
  }

  private close(error: Error): void {
    if (this.terminalError) return;
    this.terminalError = error;
    for (const id of Array.from(this.pending.keys()))
      this.take(id)?.reject(error);
    this.worker.onmessage = null;
    this.worker.onerror = null;
    this.worker.onmessageerror = null;
    this.worker.terminate?.();
  }

  private handle(data: unknown): void {
    if (
      !data ||
      typeof data !== 'object' ||
      !('id' in data) ||
      typeof data.id !== 'number' ||
      !Number.isSafeInteger(data.id) ||
      data.id <= 0
    ) {
      this.close(new Error('Malformed core worker response'));
      return;
    }
    const pending = this.take(data.id);
    // Responses to expired requests do not fail unrelated work.
    if (!pending) return;
    if (!('ok' in data) || typeof data.ok !== 'boolean') {
      pending.reject(new Error('Malformed core worker response'));
    } else if (data.ok) {
      pending.resolve('value' in data ? data.value : undefined);
    } else {
      pending.reject(
        new Error(
          'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Core worker request failed'
        )
      );
    }
  }
}
