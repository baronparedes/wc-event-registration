import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebounce } from '../useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial value immediately on mount', () => {
    const { result } = renderHook(() => useDebounce(5, 400));
    expect(result.current).toBe(5);
  });

  it('debounces value changes until the timer elapses', () => {
    const { result, rerender } = renderHook(({ val }) => useDebounce(val, 400), {
      initialProps: { val: 1 },
    });

    expect(result.current).toBe(1);

    // Update value to 2
    rerender({ val: 2 });
    expect(result.current).toBe(1);

    // Advance 200ms (halfway)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(1);

    // Update value to 3 (resets timer)
    rerender({ val: 3 });
    expect(result.current).toBe(1);

    // Advance 200ms (not yet 400ms from last update)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(1);

    // Advance remaining 200ms
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe(3);
  });

  it('cleans up timeout on unmount without errors', () => {
    const { unmount, rerender } = renderHook(({ val }) => useDebounce(val, 400), {
      initialProps: { val: 10 },
    });

    rerender({ val: 20 });
    unmount();

    act(() => {
      vi.advanceTimersByTime(500);
    });
  });
});
