// 评分聚合专用内存 TTL 缓存，与用户数据 IStorage（profile）职责分离。

interface CacheEntry<T> {
  expiresAt: number;
  value: T;
}

export interface TtlCacheOptions {
  /** 未显式指定 ttl 时使用的默认存活时间。 */
  defaultTtlMs: number;
  maxEntries?: number;
  /** 清理过期项的间隔。 */
  cleanupIntervalMs?: number;
}

const DEFAULT_MAX_ENTRIES = 5000;
const DEFAULT_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

export class TtlCache<T> {
  private readonly store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(options: TtlCacheOptions) {
    this.defaultTtlMs = options.defaultTtlMs;
    this.maxEntries = options.maxEntries ?? DEFAULT_MAX_ENTRIES;
    this.cleanupTimer = this.startCleanupTimer(
      options.cleanupIntervalMs ?? DEFAULT_CLEANUP_INTERVAL_MS
    );
  }

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    this.store.set(key, {
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      value,
    });

    // 超额立即驱逐，避免突发写入长期超过上限。
    if (this.store.size > this.maxEntries) {
      this.evictExcess();
    }
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.store.clear();
  }

  private startCleanupTimer(intervalMs: number): NodeJS.Timeout | null {
    const timer = setInterval(() => {
      this.evictExpired(Date.now());
    }, intervalMs);

    // 服务端场景避免定时器阻塞进程退出
    if (
      typeof (timer as unknown as { unref?: () => void }).unref === 'function'
    ) {
      (timer as unknown as { unref: () => void }).unref();
    }

    return timer;
  }

  private evictExpired(now: number): void {
    this.store.forEach((entry, key) => {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    });
  }

  // 按过期时间从早到晚驱逐超额项。
  private evictExcess(): void {
    const entries = Array.from(this.store.entries()).sort(
      (a, b) => a[1].expiresAt - b[1].expiresAt
    );
    const removeCount = this.store.size - this.maxEntries;

    for (let index = 0; index < removeCount; index++) {
      const entry = entries[index];
      if (entry) {
        this.store.delete(entry[0]);
      }
    }
  }
}