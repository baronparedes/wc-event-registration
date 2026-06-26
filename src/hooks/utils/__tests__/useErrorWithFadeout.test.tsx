import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useErrorWithFadeout } from '../useErrorWithFadeout'

describe('useErrorWithFadeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows, fades, and clears errors on the configured schedule', () => {
    const onFadeStart = vi.fn()
    const onClear = vi.fn()

    const { result } = renderHook(() =>
      useErrorWithFadeout({ fadeOutDelay: 100, clearDelay: 200, onFadeStart, onClear }),
    )

    act(() => {
      result.current.showError('Something went wrong')
    })

    expect(result.current.error).toBe('Something went wrong')
    expect(result.current.isFadingOut).toBe(false)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.isFadingOut).toBe(true)
    expect(onFadeStart).toHaveBeenCalledTimes(1)

    act(() => {
      vi.advanceTimersByTime(100)
    })

    expect(result.current.error).toBeNull()
    expect(result.current.isFadingOut).toBe(false)
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('can disable auto fadeout per call and clear manually', () => {
    const { result } = renderHook(() => useErrorWithFadeout({ fadeOutDelay: 50, clearDelay: 100 }))

    act(() => {
      result.current.showError('Persistent error', { autoFadeOut: false })
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(result.current.error).toBe('Persistent error')
    expect(result.current.isFadingOut).toBe(false)

    act(() => {
      result.current.clearError()
    })

    expect(result.current.error).toBeNull()
    expect(result.current.isFadingOut).toBe(false)
  })
})
