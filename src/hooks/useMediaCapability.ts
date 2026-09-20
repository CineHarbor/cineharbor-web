import { useCallback, useEffect, useRef, useState } from 'react';

import {
  mediaCapabilityRefreshDelay,
  needsMediaCapabilityRefresh,
} from '@/lib/core/media/media-capability';

const REFRESH_ERROR = '媒体授权刷新失败，请重新加载内容后重试';

/** Refresh expiring resources without rewriting signatures or affecting offline playback. */
export function useMediaCapability({
  url,
  reload,
  enabled = true,
}: {
  url: string;
  reload: () => Promise<string>;
  enabled?: boolean;
}) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const [refreshId, setRefreshId] = useState(0);
  const [resolved, setResolved] = useState({ input: '', url: '', error: '' });
  const refreshRequest = useRef({ input: '', at: -Infinity });

  // One forced retry per input per 30 seconds; repeated 401/403 cannot spin indefinitely.
  const refresh = useCallback(() => {
    if (!enabled || !url) return false;
    const now = Date.now();
    if (
      refreshRequest.current.input === url &&
      now - refreshRequest.current.at < 30_000
    ) {
      return false;
    }
    refreshRequest.current = { input: url, at: now };
    setRefreshId((value) => value + 1);
    return true;
  }, [enabled, url]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const apply = async (candidate: string, force = false) => {
      try {
        if (
          enabled &&
          candidate &&
          (force || needsMediaCapabilityRefresh(candidate))
        ) {
          candidate = await reloadRef.current();
          if (!candidate || needsMediaCapabilityRefresh(candidate))
            throw new Error(REFRESH_ERROR);
        }
        if (!active) return;
        setResolved({ input: url, url: candidate, error: '' });
        const delay =
          enabled && candidate ? mediaCapabilityRefreshDelay(candidate) : null;
        if (delay !== null && delay > 0)
          timer = setTimeout(() => void apply(candidate, true), delay);
      } catch {
        if (active) setResolved({ input: url, url: '', error: REFRESH_ERROR });
      }
    };
    const force = refreshId > 0 && refreshRequest.current.input === url;
    void apply(url, force);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [enabled, url, refreshId]);

  return {
    url: !enabled
      ? url
      : resolved.input === url
      ? resolved.url
      : needsMediaCapabilityRefresh(url)
      ? ''
      : url,
    error: enabled && resolved.input === url ? resolved.error : '',
    refresh,
  };
}
