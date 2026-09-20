import { act, renderHook } from '@testing-library/react';

import { useMediaCapability } from './useMediaCapability';

const NOW = 1_800_000_000_000;
const signed = (seconds = 3600, source = 'demo') =>
  `https://addon.test/prefix/media/vod/m3u8?source=${source}&url=https%3A%2F%2Fcdn.test%2Findex&expires=${
    NOW / 1000 + seconds
  }&sig=${'a'.repeat(43)}`;
const settle = async () => {
  await act(async () => {
    await Promise.resolve();
  });
};

describe('media authorization lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  it('plays the issued URL unchanged and renews before expiry', async () => {
    const reload = jest.fn().mockResolvedValue(signed(7200));
    const { result } = renderHook(() =>
      useMediaCapability({ url: signed(120), reload })
    );
    expect(result.current.url).toBe(signed(120));
    expect(reload).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(60_000);
    });
    expect(result.current.url).toBe(signed(7200));
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('renews expired stored metadata without attempting the stale request', async () => {
    const reload = jest.fn().mockResolvedValue(signed());
    const { result } = renderHook(() =>
      useMediaCapability({ url: signed(-10), reload })
    );
    expect(result.current.url).toBe('');
    await settle();
    expect(result.current.url).toBe(signed());
  });
  it('discards a late response after switching episodes or channels', async () => {
    let resolveOld!: (url: string) => void;
    const reload = jest.fn().mockImplementation(
      () =>
        new Promise<string>((resolve) => {
          resolveOld = resolve;
        })
    );
    const { result, rerender } = renderHook(
      ({ url }) => useMediaCapability({ url, reload }),
      { initialProps: { url: signed(-1) } }
    );
    rerender({ url: signed(3600, 'other') });
    await act(async () => {
      resolveOld(signed());
    });
    expect(result.current.url).toBe(signed(3600, 'other'));
  });
  it('keeps intentional offline resources and expired offline URLs without network renewal', async () => {
    const reload = jest.fn();
    const { result } = renderHook(() =>
      useMediaCapability({ url: signed(-1), reload, enabled: false })
    );
    await act(async () => {
      jest.advanceTimersByTime(100_000);
    });
    expect(result.current.url).toBe(signed(-1));
    expect(reload).not.toHaveBeenCalled();
    expect(result.current.refresh()).toBe(false);
  });
  it('cancels the scheduled renewal when unmounted', async () => {
    const reload = jest.fn();
    const { unmount } = renderHook(() =>
      useMediaCapability({ url: signed(120), reload })
    );
    unmount();
    await act(async () => {
      jest.advanceTimersByTime(100_000);
    });
    expect(reload).not.toHaveBeenCalled();
  });
  it('allows one forced authorization retry and suppresses repeated failures', async () => {
    const reload = jest.fn().mockResolvedValue(signed(7200));
    const { result } = renderHook(() =>
      useMediaCapability({ url: signed(), reload })
    );
    act(() => {
      expect(result.current.refresh()).toBe(true);
      expect(result.current.refresh()).toBe(false);
    });
    await settle();
    expect(result.current.url).toBe(signed(7200));
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('fails closed with a sanitized message rather than a signed URL or an infinite retry', async () => {
    const reload = jest.fn().mockRejectedValue(new Error(signed(-1)));
    const { result } = renderHook(() =>
      useMediaCapability({ url: signed(-1), reload })
    );
    await settle();
    expect(result.current.url).toBe('');
    expect(result.current.error).toBe('媒体授权刷新失败，请重新加载内容后重试');
    expect(result.current.error).not.toContain('sig=');
    await act(async () => {
      jest.advanceTimersByTime(100_000);
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });
  it('does not accept empty or already-expired renewal results', async () => {
    const { result } = renderHook(() =>
      useMediaCapability({ url: signed(-1), reload: async () => signed(1) })
    );
    await settle();
    expect(result.current.url).toBe('');
    expect(result.current.error).toBeTruthy();
  });
});
