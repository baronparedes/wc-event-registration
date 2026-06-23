import { useEffect, useState, useCallback, useRef } from 'react'

export type ErrorWithFadeoutOptions = {
  fadeOutDelay?: number // time before fade animation starts (default: 4500ms)
  clearDelay?: number // time before error is completely cleared (default: 5000ms)
  onClear?: () => void // callback when error is cleared
}

/**
 * Custom hook for managing error messages with auto-fadeout and auto-clear.
 * Handles the full lifecycle: set → fade → clear.
 */
export function useErrorWithFadeout(options: ErrorWithFadeoutOptions = {}) {
  const { fadeOutDelay = 4500, clearDelay = 5000, onClear } = options

  const [error, setError] = useState<string | null>(null)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const [shouldAutoFadeOut, setShouldAutoFadeOut] = useState(false)
  const timeoutsRef = useRef<{ fade?: NodeJS.Timeout; clear?: NodeJS.Timeout }>({})

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutsRef.current.fade) clearTimeout(timeoutsRef.current.fade)
      if (timeoutsRef.current.clear) clearTimeout(timeoutsRef.current.clear)
    }
  }, [])

  // Handle auto-fadeout lifecycle
  useEffect(() => {
    if (!shouldAutoFadeOut || !error) {
      return
    }

    // Schedule fade animation
    timeoutsRef.current.fade = setTimeout(() => {
      setIsFadingOut(true)
    }, fadeOutDelay)

    // Schedule complete clear
    timeoutsRef.current.clear = setTimeout(() => {
      setError(null)
      setIsFadingOut(false)
      setShouldAutoFadeOut(false)
      onClear?.()
    }, clearDelay)

    return () => {
      if (timeoutsRef.current.fade) clearTimeout(timeoutsRef.current.fade)
      if (timeoutsRef.current.clear) clearTimeout(timeoutsRef.current.clear)
    }
  }, [shouldAutoFadeOut, error, fadeOutDelay, clearDelay, onClear])

  const showError = useCallback((message: string) => {
    setError(message)
    setIsFadingOut(false)
    setShouldAutoFadeOut(true)
  }, [])

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
