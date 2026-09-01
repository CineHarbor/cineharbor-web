//! 与 `public/core-worker.js` 的 IndexedDB 存储 RPC 对话的类型化客户端（get/set/remove）。
//!
//! 独立于 addon 专用的 `CoreWorkerClient`：`get` 必须区分「缺键(undefined/null→null)」与
//! 「空串」，故保留 `string | null` 语义。

import type { WorkerLike } from "./worker-client";

interface RequestMessage {
  id: number;
  op: string;
  args: unknown[];
}

interface ResponseMessage {
  id: number;
  ok: boolean;
  value?: string | null;
  error?: string;
}

interface Pending {
  resolve: (value: string | null) => void;
  reject: (error: Error) => void;
}

export class CoreStorageClient {
  private nextId = 1;
  private pending = new Map<number, Pending>();

  constructor(private readonly worker: WorkerLike) {
    worker.onmessage = (event) => this.handle(event.data as ResponseMessage);
  }

  get(key: string): Promise<string | null> {
    return this.request("storage_get", [key]);
  }

  set(key: string, value: string): Promise<void> {
    return this.request("storage_set", [key, value]).then(() => undefined);
  }

  remove(key: string): Promise<void> {
    return this.request("storage_remove", [key]).then(() => undefined);
  }

  dispose(): void {
    this.pending.clear();
    this.worker.terminate?.();
  }

  private request(op: string, args: unknown[]): Promise<string | null> {
    return new Promise((resolve, reject) => {
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

  private handle(message: ResponseMessage): void {
    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }
    this.pending.delete(message.id);
    if (message.ok) {
      pending.resolve(
        message.value === undefined || message.value === null
          ? null
          : message.value,
      );
    } else {
      pending.reject(new Error(message.error ?? "storage worker error"));
    }
  }
}