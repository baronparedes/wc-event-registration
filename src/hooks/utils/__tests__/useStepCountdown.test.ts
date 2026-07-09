import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useStepCountdown } from '../useStepCountdown';

describe('useStepCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns null when isActive is false', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useStepCountdown(onComplete, 5000, false));

    expect(result.current.secondsRemaining).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('starts counting down when isActive is true', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useStepCountdown(onComplete, 5000, true));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.secondsRemaining).toBe(5);
  });

  it('decrements secondsRemaining each second', async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() => useStepCountdown(onComplete, 5000, true));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.secondsRemaining).toBeLessThanOrEqual(4);
  });

  it('calls onComplete when the countdown expires', async () => {
    const onComplete = vi.fn();
    renderHook(() => useStepCountdown(onComplete, 3000, true));

    await act(async () => {
      vi.advanceTimersByTime(3001);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('stops the countdown and returns null when isActive becomes false', async () => {
    const onComplete = vi.fn();
    let isActive = true;

    const { result, rerender } = renderHook(() => useStepCountdown(onComplete, 10000, isActive));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.secondsRemaining).toBe(10);

    isActive = false;
    rerender();

    expect(result.current.secondsRemaining).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('does not call onComplete after deactivation', async () => {
    const onComplete = vi.fn();
    let isActive = true;

    const { rerender } = renderHook(() => useStepCountdown(onComplete, 3000, isActive));

    await act(async () => {
      vi.advanceTimersByTime(0);
    });

    isActive = false;
    rerender();

    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    expect(onComplete).not.toHaveBeenCalled();
  });
});
