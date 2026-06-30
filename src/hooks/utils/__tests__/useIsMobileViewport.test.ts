import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useIsMobileViewport } from '../useIsMobileViewport'

describe('useIsMobileViewport', () => {
  let innerWidthSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    innerWidthSpy = vi.spyOn(window, 'innerWidth', 'get')
  })

  afterEach(() => {
    innerWidthSpy.mockRestore()
    vi.clearAllMocks()
  })

  it('returns true when viewport width < 768px', () => {
    innerWidthSpy.mockReturnValue(500)
    const { result } = renderHook(() => useIsMobileViewport())
    expect(result.current).toBe(true)
  })

  it('returns false when viewport width >= 768px', () => {
    innerWidthSpy.mockReturnValue(1024)
    const { result } = renderHook(() => useIsMobileViewport())
    expect(result.current).toBe(false)
  })

  it('returns true at exactly 767px', () => {
    innerWidthSpy.mockReturnValue(767)
    const { result } = renderHook(() => useIsMobileViewport())
    expect(result.current).toBe(true)
  })

  it('returns false at exactly 768px', () => {
    innerWidthSpy.mockReturnValue(768)
    const { result } = renderHook(() => useIsMobileViewport())
    expect(result.current).toBe(false)
  })
})
