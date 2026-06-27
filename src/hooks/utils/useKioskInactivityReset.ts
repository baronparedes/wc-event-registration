import { useEffect, useRef, useCallback } from 'react'
import { TIMING } from '@/config/constants'

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
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (isActive) {
      timeoutRef.current = setTimeout(onReset, timeoutMs)
    }
  }, [onReset, timeoutMs, isActive])

  // Clear and restart timeout on any user activity
  const recordActivity = useCallback(() => {
    resetTimeout()
  }, [resetTimeout])

  // Set up global activity listeners
  useEffect(() => {
    if (!isActive) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    // Initial timeout start
    resetTimeout()

    // Listen for activity: keydown, click, input change
    const handleActivity = () => {
      recordActivity()
    }

    document.addEventListener('keydown', handleActivity)
    document.addEventListener('click', handleActivity)
    document.addEventListener('input', handleActivity)
    document.addEventListener('change', handleActivity)

    return () => {
      document.removeEventListener('keydown', handleActivity)
      document.removeEventListener('click', handleActivity)
      document.removeEventListener('input', handleActivity)
      document.removeEventListener('change', handleActivity)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [isActive, recordActivity, resetTimeout])
}
