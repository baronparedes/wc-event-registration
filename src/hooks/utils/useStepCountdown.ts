import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Fixed step countdown hook.
 *
 * Counts down from durationMs to zero and calls onComplete when it expires.
 * Unlike useKioskInactivityReset, this timer is NOT reset by user activity —
 * it is a pure deadline countdown, useful for "you have N seconds to confirm"
 * wizard step transitions.
 *
 * @param onComplete - Callback fired when the countdown reaches zero
 * @param durationMs - Total countdown duration in milliseconds
 * @param isActive - Whether the countdown is running (default: true)
 */
export function useStepCountdown(
  onComplete: () => void,
  durationMs: number,
  isActive: boolean = true,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    deadlineRef.current = null;
  }, []);

  useEffect(() => {
    if (!isActive) {
      clearTimers();
      return;
    }

    const initialSetupId = setTimeout(() => {
      deadlineRef.current = Date.now() + durationMs;
      setSecondsRemaining(Math.ceil(durationMs / 1000));

      timeoutRef.current = setTimeout(onComplete, durationMs);

      intervalRef.current = setInterval(() => {
        const deadline = deadlineRef.current;
        if (!deadline) {
          return;
        }
        const remainingMs = Math.max(0, deadline - Date.now());
        setSecondsRemaining(Math.ceil(remainingMs / 1000));
      }, 1000);
    }, 0);

    return () => {
      clearTimeout(initialSetupId);
      clearTimers();
    };
  }, [clearTimers, durationMs, isActive, onComplete]);

  return {
    secondsRemaining: isActive ? secondsRemaining : null,
  };
}
