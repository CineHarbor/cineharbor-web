'use client';

import { useEffect, useRef, useState } from 'react';

/** App Router registration, with explicit error/retry and non-disruptive update activation. */
export default function PwaRegistration({ enabled }: { enabled: boolean }) {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState(false);
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const activating = useRef(false);

  useEffect(() => {
    if (!enabled || !('serviceWorker' in navigator)) return;
    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let installing: ServiceWorker | null = null;
    setError(false);
    const failed = () => {
      if (active) setError(true);
    };
    const installed = () => {
      if (
        active &&
        installing?.state === 'installed' &&
        navigator.serviceWorker.controller
      ) {
        setWaiting(registration?.waiting ?? installing);
      }
    };
    const updateFound = () => {
      installing?.removeEventListener('statechange', installed);
      installing = registration?.installing ?? null;
      installing?.addEventListener('statechange', installed);
    };
    const controlled = () => {
      if (activating.current) window.location.reload();
    };
    const online = () => {
      void registration?.update().catch(failed);
    };
    navigator.serviceWorker.addEventListener('controllerchange', controlled);
    window.addEventListener('online', online);
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((value) => {
        if (!active) return;
        registration = value;
        if (value.waiting && navigator.serviceWorker.controller)
          setWaiting(value.waiting);
        value.addEventListener('updatefound', updateFound);
        updateFound();
        return value.update();
      })
      .catch(failed);
    return () => {
      active = false;
      installing?.removeEventListener('statechange', installed);
      registration?.removeEventListener('updatefound', updateFound);
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        controlled
      );
      window.removeEventListener('online', online);
    };
  }, [enabled, attempt]);

  if (!enabled || (!waiting && !error)) return null;
  return (
    <div
      role='status'
      className='fixed bottom-4 left-4 z-50 max-w-sm rounded-lg bg-gray-900 p-3 text-sm text-white shadow-lg'
    >
      {waiting ? (
        <>
          <p>新版本已准备好。更新会重新载入页面，本地收藏和历史将保留。</p>
          <button
            className='mt-2 underline'
            onClick={() => {
              activating.current = true;
              waiting.postMessage({ type: 'SKIP_WAITING' });
            }}
          >
            更新并重新载入
          </button>
        </>
      ) : (
        <>
          <p>离线功能暂不可用，联网后可重试。在线功能不受影响。</p>
          <button
            className='mt-2 underline'
            onClick={() => setAttempt((value) => value + 1)}
          >
            重试离线功能
          </button>
        </>
      )}
    </div>
  );
}
