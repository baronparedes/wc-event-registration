import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useKioskInactivityReset } from '../useKioskInactivityReset'

describe('useKioskInactivityReset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('resets the inactivity timer on user activity and fires on timeout', () => {
    const onReset = vi.fn()
    const addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

    const { result } = renderHook(() => useKioskInactivityReset(onReset, 1000, true))

    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(result.current.secondsRemaining).toBe(1)
    expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))

    act(() => {
      document.dispatchEvent(new Event('click'))
    })

    act(() => {
      vi.advanceTimersByTime(999)
    })

    expect(onReset).not.toHaveBeenCalled()

    expect(result.current.secondsRemaining).toBe(1)
    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(onReset).toHaveBeenCalledTimes(1)

    const { unmount } = renderHook(() => useKioskInactivityReset(onReset, 1000, true))
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('input', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('change', expect.any(Function))
  })

  it('does not schedule a timeout when inactive', () => {
    const onReset = vi.fn()
    const { result } = renderHook(() => useKioskInactivityReset(onReset, 1000, false))

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onReset).not.toHaveBeenCalled()
    expect(result.current.secondsRemaining).toBeNull()
  })
})
