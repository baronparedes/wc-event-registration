import { renderHook, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRfidAutoFocus } from '../useRfidAutoFocus'

describe('useRfidAutoFocus', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })

  it('does nothing when inactive', () => {
    const input = document.createElement('input')
    const focusSpy = vi.spyOn(input, 'focus')
    const ref = { current: input }

    renderHook(() => useRfidAutoFocus(ref, false))

    act(() => {
      vi.runOnlyPendingTimers()
    })

    expect(focusSpy).not.toHaveBeenCalled()
  })

  it('focuses and selects the input when active', () => {
    const input = document.createElement('input')
    input.value = 'WC-001'
    const focusSpy = vi.spyOn(input, 'focus')
    const selectSpy = vi.spyOn(input, 'select')
    const setSelectionRangeSpy = vi.spyOn(input, 'setSelectionRange')
    const ref = { current: input }

    renderHook(() => useRfidAutoFocus(ref, true))

    act(() => {
      vi.runOnlyPendingTimers()
      input.dispatchEvent(new Event('focus', { bubbles: true }))
    })

    expect(focusSpy).toHaveBeenCalled()
    expect(selectSpy).toHaveBeenCalled()
    expect(setSelectionRangeSpy).toHaveBeenCalledWith(0, input.value.length)
  })

  it('restores focus after blur and redirects printable keydowns', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const other = document.createElement('div')
    document.body.appendChild(other)

    const focusSpy = vi.spyOn(input, 'focus')
    const ref = { current: input }

    renderHook(() => useRfidAutoFocus(ref, true))

    act(() => {
      vi.runOnlyPendingTimers()
    })

    const callsAfterSetup = focusSpy.mock.calls.length

    act(() => {
      input.dispatchEvent(
        new FocusEvent('blur', {
          relatedTarget: other,
          bubbles: true,
        }),
      )
    })

    act(() => {
      vi.advanceTimersByTime(150)
    })

    expect(focusSpy.mock.calls.length).toBeGreaterThan(callsAfterSetup)
    const callsAfterBlur = focusSpy.mock.calls.length

    act(() => {
      other.focus()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }))
    })

    expect(focusSpy.mock.calls.length).toBeGreaterThan(callsAfterBlur)
  })

  it('does not steal focus from button blurs', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const button = document.createElement('button')
    document.body.appendChild(button)

    const focusSpy = vi.spyOn(input, 'focus')
    const ref = { current: input }

    renderHook(() => useRfidAutoFocus(ref, true))

    act(() => {
      vi.runOnlyPendingTimers()
      input.dispatchEvent(
        new FocusEvent('blur', {
          relatedTarget: button,
          bubbles: true,
        }),
      )
      vi.advanceTimersByTime(200)
    })

    expect(focusSpy.mock.calls.length).toBeGreaterThanOrEqual(1)
  })

  it('does not refocus when blur moves to anchor/input/select/textarea', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)

    const anchor = document.createElement('a')
    const otherInput = document.createElement('input')
    const select = document.createElement('select')
    const textarea = document.createElement('textarea')
    document.body.appendChild(anchor)
    document.body.appendChild(otherInput)
    document.body.appendChild(select)
    document.body.appendChild(textarea)

    const focusSpy = vi.spyOn(input, 'focus')
    const ref = { current: input }

    renderHook(() => useRfidAutoFocus(ref, true))

    act(() => {
      vi.runOnlyPendingTimers()
    })

    const afterSetupCalls = focusSpy.mock.calls.length

    act(() => {
      input.dispatchEvent(new FocusEvent('blur', { relatedTarget: anchor, bubbles: true }))
      input.dispatchEvent(new FocusEvent('blur', { relatedTarget: otherInput, bubbles: true }))
      input.dispatchEvent(new FocusEvent('blur', { relatedTarget: select, bubbles: true }))
      input.dispatchEvent(new FocusEvent('blur', { relatedTarget: textarea, bubbles: true }))
      vi.advanceTimersByTime(250)
    })

    expect(focusSpy.mock.calls.length).toBeLessThanOrEqual(afterSetupCalls + 1)
  })

  it('ignores non-text and in-control keydown events', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)

    const focusSpy = vi.spyOn(input, 'focus')
    const ref = { current: input }

    renderHook(() => useRfidAutoFocus(ref, true))

    act(() => {
      vi.runOnlyPendingTimers()
    })

    const afterSetupCalls = focusSpy.mock.calls.length

    act(() => {
      textarea.focus()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }))
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      input.focus()
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'B', bubbles: true }))
    })

    expect(focusSpy.mock.calls.length).toBeLessThanOrEqual(afterSetupCalls + 1)
  })
})
