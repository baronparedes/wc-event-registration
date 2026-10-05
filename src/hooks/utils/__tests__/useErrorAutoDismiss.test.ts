import { renderHook, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

import { TIMING } from '@/config/constants';
import { useErrorAutoDismiss } from '../useErrorAutoDismiss';

describe('useErrorAutoDismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('initializes with default state when no message is provided', () => {
    const { result } = renderHook(() => useErrorAutoDismiss(null));

    expect(result.current.shouldFade).toBe(false);
    expect(result.current.errorCountdown).toBe(0);
  });

  it('starts countdown when a message is provided', () => {
    const { result } = renderHook(() => useErrorAutoDismiss('Error occurred'));

    expect(result.current.errorCountdown).toBe(TIMING.errorClearDelayMs / 1000);
    expect(result.current.shouldFade).toBe(false);
  });

  it('ticks down the countdown over time', () => {
    const { result } = renderHook(() => useErrorAutoDismiss('Error occurred'));

    const initialCountdown = TIMING.errorClearDelayMs / 1000;
    expect(result.current.errorCountdown).toBe(initialCountdown);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.errorCountdown).toBe(initialCountdown - 1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.errorCountdown).toBe(initialCountdown - 3);
  });

  it('sets shouldFade to true and calls onDismiss when countdown reaches 0', () => {
    const onDismiss = vi.fn();
    const { result } = renderHook(() => useErrorAutoDismiss('Error occurred', false, onDismiss));

    const initialCountdown = TIMING.errorClearDelayMs / 1000;

    act(() => {
      vi.advanceTimersByTime(initialCountdown * 1000);
    });

    expect(result.current.errorCountdown).toBe(0);
    expect(result.current.shouldFade).toBe(true);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not start countdown when suppress is true', () => {
    const { result } = renderHook(() => useErrorAutoDismiss('Error occurred', true));

    expect(result.current.errorCountdown).toBe(0);
    expect(result.current.shouldFade).toBe(false);
  });

  it('resets state when a new message arrives', () => {
    const { result, rerender } = renderHook(
      ({ message }) => useErrorAutoDismiss(message),
      { initialProps: { message: 'First error' } }
    );

    const initialCountdown = TIMING.errorClearDelayMs / 1000;

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.errorCountdown).toBe(initialCountdown - 5);
    expect(result.current.shouldFade).toBe(false);

    // Rerender with a new message
    rerender({ message: 'Second error' });

    // The effect should run and reset the timer
    expect(result.current.errorCountdown).toBe(initialCountdown);
    expect(result.current.shouldFade).toBe(false);
  });

  it('clears interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useErrorAutoDismiss('Error occurred'));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
