import { TtlCache } from './cache';

describe('TtlCache', () => {
  it('set/get 往返', () => {
    const cache = new TtlCache<string>({ defaultTtlMs: 60_000 });
    cache.set('k', 'v');
    expect(cache.get('k')).toBe('v');
    expect(cache.get('missing')).toBeUndefined();
    cache.dispose();
  });

  it('过期项不可见', () => {
    const cache = new TtlCache<string>({ defaultTtlMs: 0 });
    cache.set('k', 'v');
    expect(cache.get('k')).toBeUndefined();
    cache.dispose();
  });

  it('超过 maxEntries 时按过期时间驱逐', () => {
    const cache = new TtlCache<string>({ defaultTtlMs: 60_000, maxEntries: 2 });
    cache.set('a', 'a');
    cache.set('b', 'b');
    cache.set('c', 'c');
    // 三者同时过期，驱逐最早插入的 a
    expect(cache.get('a')).toBeUndefined();
    cache.dispose();
  });

  it('delete/clear', () => {
    const cache = new TtlCache<number>({ defaultTtlMs: 60_000 });
    cache.set('a', 1);
    cache.set('b', 2);
    cache.delete('a');
    expect(cache.get('a')).toBeUndefined();
    cache.clear();
    expect(cache.size).toBe(0);
    cache.dispose();
  });
});