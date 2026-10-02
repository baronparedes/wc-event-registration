import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsMobileViewport } from '../useIsMobileViewport';

describe('useIsMobileViewport', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    // Reset innerWidth before each test
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  afterEach(() => {
    // Restore innerWidth
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
    vi.restoreAllMocks();
  });

  it('should return true when window width is less than 768', () => {
    Object.defineProperty(window, 'innerWidth', { value: 767 });

    const { result } = renderHook(() => useIsMobileViewport());

    expect(result.current).toBe(true);
  });

  it('should return false when window width is 768 or greater', () => {
    Object.defineProperty(window, 'innerWidth', { value: 768 });

    const { result } = renderHook(() => useIsMobileViewport());

    expect(result.current).toBe(false);
  });

  it('should update value on window resize', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    const { result } = renderHook(() => useIsMobileViewport());

    expect(result.current).toBe(false);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 500 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(true);

    act(() => {
      Object.defineProperty(window, 'innerWidth', { value: 800 });
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current).toBe(false);
  });
});
