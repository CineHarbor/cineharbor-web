//! 与 `public/core-worker.js` 对话的类型化 RPC 客户端。
//!
//! 抽象 `WorkerLike`（postMessage + onmessage + 可选 terminate）以便在 jest 里注入假 Worker
//! 断言协议，而不真正起浏览器 Worker。

export interface WorkerLike {
  postMessage(message: unknown): void;
  onmessage: ((event: { data: unknown }) => void) | null;
  terminate?(): void;
}

interface RequestMessage {
  id: number;
  op: string;
  args: unknown[];
}

interface ResponseMessage {
  id: number;
  ok: boolean;
  value?: string;
  error?: string;
}

interface Pending {
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}

export class CoreWorkerClient {
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor(private readonly worker: WorkerLike) {
    worker.onmessage = (event) => this.handleResponse(event.data as ResponseMessage);
  }

  /** 发一个请求，回包按 `id` 分派 resolve/reject；json 字符串结果。 */
  request(op: string, args: unknown[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      const message: RequestMessage = { id, op, args };
      try {
        this.worker.postMessage(message);
      } catch (error) {
        this.pending.delete(id);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  dispose(): void {
    this.pending.clear();
    this.worker.terminate?.();
  }

  private handleResponse(message: ResponseMessage): void {
    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }
    this.pending.delete(message.id);
    if (message.ok) {
      pending.resolve(message.value ?? "");
    } else {
      pending.reject(new Error(message.error ?? "core worker error"));
    }
  }
}