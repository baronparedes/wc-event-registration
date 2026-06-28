import { useEffect, useState, useCallback, useRef } from 'react'
import { TIMING } from '@/config/constants'

export type ErrorWithFadeoutOptions = {
  fadeOutDelay?: number // time before fade animation starts (default: 4500ms)
  clearDelay?: number // time before error is completely cleared (default: 5000ms)
  autoFadeOut?: boolean // when false, keep the error visible until manually cleared
  onFadeStart?: () => void // callback when fade animation starts
  onClear?: () => void // callback when error is cleared
}

type ShowErrorOptions = {
  autoFadeOut?: boolean
}

/**
 * Custom hook for managing error messages with auto-fadeout and auto-clear.
 * Handles the full lifecycle: set → fade → clear.
 */
export function useErrorWithFadeout(options: ErrorWithFadeoutOptions = {}) {
  const {
    fadeOutDelay = TIMING.errorFadeOutDelayMs,
    clearDelay = TIMING.errorClearDelayMs,
    autoFadeOut = true,
    onFadeStart,
    onClear,
  } = options

  const [error, setError] = useState<string | null>(null)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [shouldAutoFadeOut, setShouldAutoFadeOut] = useState(false)
  const timeoutsRef = useRef<{ fade?: NodeJS.Timeout; clear?: NodeJS.Timeout }>({})

  // Clean up timeouts on unmount
  useEffect(() => {
    const timeouts = timeoutsRef.current

    return () => {
      if (timeouts.fade) clearTimeout(timeouts.fade)
      if (timeouts.clear) clearTimeout(timeouts.clear)
    }
  }, [])

  // Handle auto-fadeout lifecycle
  useEffect(() => {
    if (!shouldAutoFadeOut || !error) {
      return
    }

    // Schedule fade animation
    const fadeTimeout = setTimeout(() => {
      setIsFadingOut(true)
      onFadeStart?.()
    }, fadeOutDelay)

    // Schedule complete clear
    const clearTimeoutId = setTimeout(() => {
      setError(null)
      setIsFadingOut(false)
      setShouldAutoFadeOut(false)
      onClear?.()
    }, clearDelay)

    timeoutsRef.current.fade = fadeTimeout
    timeoutsRef.current.clear = clearTimeoutId

    return () => {
      clearTimeout(fadeTimeout)
      clearTimeout(clearTimeoutId)
    }
  }, [shouldAutoFadeOut, error, fadeOutDelay, clearDelay, onFadeStart, onClear])

  const showError = useCallback(
    (message: string, options?: ShowErrorOptions) => {
      if (timeoutsRef.current.fade) clearTimeout(timeoutsRef.current.fade)
      if (timeoutsRef.current.clear) clearTimeout(timeoutsRef.current.clear)

      setError(message)
      setIsFadingOut(false)
      setShouldAutoFadeOut(options?.autoFadeOut ?? autoFadeOut)
    },
    [autoFadeOut],
  )

  const clearError = useCallback(() => {
    setError(null)
    setIsFadingOut(false)
    setShouldAutoFadeOut(false)
    if (timeoutsRef.current.fade) clearTimeout(timeoutsRef.current.fade)
    if (timeoutsRef.current.clear) clearTimeout(timeoutsRef.current.clear)
  }, [])

  return {
    error,
    isFadingOut,
    showError,
    clearError,
  }
}
