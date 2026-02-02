import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'] as const;
const CHECK_INTERVAL_MS = 60_000; // Check every minute
const MOUSEMOVE_THROTTLE_MS = 1000; // Throttle mousemove to avoid excessive updates

export function useSessionTimeout(options: {
  enabled: boolean;
  timeoutMs: number;
  onTimeout: () => void;
}) {
  const { enabled, timeoutMs, onTimeout } = options;
  const lastActivityRef = useRef<number>(Date.now());
  const mousemoveThrottleRef = useRef<number>(0);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    lastActivityRef.current = Date.now();

    const handleActivity = (e: Event) => {
      // Throttle mousemove
      if (e.type === 'mousemove') {
        const now = Date.now();
        if (now - mousemoveThrottleRef.current < MOUSEMOVE_THROTTLE_MS) return;
        mousemoveThrottleRef.current = now;
      }
      updateActivity();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= timeoutMs) {
        clearInterval(interval);
        onTimeout();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearInterval(interval);
    };
  }, [enabled, timeoutMs, onTimeout, updateActivity]);
}
