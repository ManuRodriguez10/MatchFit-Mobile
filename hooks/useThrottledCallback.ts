import { useRef, useCallback } from 'react';

/**
 * Returns a throttled version of the callback that can only fire
 * once every `delayMs` milliseconds. Subsequent calls within the
 * cooldown window are silently ignored.
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delayMs: number = 2000,
): T {
  const lastCall = useRef(0);

  return useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      if (now - lastCall.current < delayMs) return;
      lastCall.current = now;
      return callback(...args);
    }) as unknown as T,
    [callback, delayMs],
  );
}
