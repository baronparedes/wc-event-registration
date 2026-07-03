import { useCallback, useEffect, useRef } from 'react';
import { useState } from 'react';

import { TIMING } from '@/config/constants';

/**
 * Kiosk inactivity timeout hook.
 *
 * After no activity for the configured timeout period, calls the reset callback.
 * Resets activity timer on: scan events, form input changes, or button clicks.
 * Useful for public kiosk terminals to auto-clear leftover user data.
 *
 * @param onReset - Callback fired when inactivity timeout expires
 * @param timeoutMs - Inactivity period in milliseconds (default: 3 minutes)
 * @param isActive - Whether to monitor inactivity (default: true)
 */
export function useKioskInactivityReset(
  onReset: () => void,
  timeoutMs: number = TIMING.kioskInactivityResetMs,
  isActive: boolean = true,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(() =>
    isActive ? Math.ceil(timeoutMs / 1000) : null,
  );

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

  const resetTimeout = useCallback(() => {
    clearTimers();

    if (isActive) {
      deadlineRef.current = Date.now() + timeoutMs;
      setSecondsRemaining(Math.ceil(timeoutMs / 1000));
      timeoutRef.current = setTimeout(onReset, timeoutMs);
      intervalRef.current = setInterval(() => {
        const deadline = deadlineRef.current;
        if (!deadline) {
          setSecondsRemaining(null);
          return;
        }

        const remainingMs = Math.max(0, deadline - Date.now());
        setSecondsRemaining(Math.ceil(remainingMs / 1000));
      }, 1000);
    }
  }, [clearTimers, onReset, timeoutMs, isActive]);

  // Clear and restart timeout on any user activity
  const recordActivity = useCallback(() => {
    resetTimeout();
  }, [resetTimeout]);

  // Set up global activity listeners
  useEffect(() => {
    if (!isActive) {
      clearTimers();
      return;
    }

    // Defer the initial setup so the effect does not synchronously trigger state updates.
    const initialSetupId = setTimeout(() => {
      resetTimeout();
    }, 0);

    // Listen for activity: keydown, click, input change
    const handleActivity = () => {
      recordActivity();
    };

    document.addEventListener('keydown', handleActivity);
    document.addEventListener('click', handleActivity);
    document.addEventListener('input', handleActivity);
    document.addEventListener('change', handleActivity);

    return () => {
      clearTimeout(initialSetupId);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('click', handleActivity);
      document.removeEventListener('input', handleActivity);
      document.removeEventListener('change', handleActivity);
      clearTimers();
    };
  }, [clearTimers, isActive, recordActivity, resetTimeout]);

  return {
    secondsRemaining: isActive ? secondsRemaining : null,
  };
}
