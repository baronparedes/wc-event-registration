import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useScanBuffer } from '../useScanBuffer';

describe('useScanBuffer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('completes a scan when Enter is pressed after printable input', () => {
    const onScanComplete = vi.fn();

    renderHook(() => useScanBuffer(onScanComplete, true));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'B', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onScanComplete).toHaveBeenCalledWith('AB');
  });

  it('auto-completes buffered scan input after the timeout threshold', () => {
    const onScanComplete = vi.fn();

    renderHook(() => useScanBuffer(onScanComplete, true));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'B', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'C', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'E', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', bubbles: true }));
      vi.advanceTimersByTime(300);
    });

    expect(onScanComplete).toHaveBeenCalledWith('ABCDEF');
  });

  it('ignores keydown events when focus is already in an editable element', () => {
    const onScanComplete = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    renderHook(() => useScanBuffer(onScanComplete, true));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onScanComplete).not.toHaveBeenCalled();
  });

  it('ignores scans that originate from the excluded input and handles delete/backspace cleanup', () => {
    const onScanComplete = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);

    renderHook(() => useScanBuffer(onScanComplete, true, { current: input }));

    act(() => {
      input.focus();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onScanComplete).not.toHaveBeenCalled();

    act(() => {
      input.blur();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'B', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'C', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
      vi.advanceTimersByTime(800);
    });

    expect(onScanComplete).not.toHaveBeenCalled();
  });

  it('does nothing when inactive', () => {
    const onScanComplete = vi.fn();

    renderHook(() => useScanBuffer(onScanComplete, false));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      vi.runOnlyPendingTimers();
    });

    expect(onScanComplete).not.toHaveBeenCalled();
  });

  it('ignores modifier and short auto-complete sequences', () => {
    const onScanComplete = vi.fn();

    renderHook(() => useScanBuffer(onScanComplete, true));

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'A', ctrlKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'B', metaKey: true, bubbles: true }),
      );
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'C', altKey: true, bubbles: true }),
      );
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'B', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'C', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'E', bubbles: true }));
      vi.advanceTimersByTime(300);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect(onScanComplete).toHaveBeenCalledTimes(1);
    expect(onScanComplete).toHaveBeenCalledWith('ABCDE');
  });

  it('auto-completes delete/backspace branch when remaining buffer stays above threshold', () => {
    const onScanComplete = vi.fn();

    renderHook(() => useScanBuffer(onScanComplete, true));

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'A', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'B', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'C', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'E', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
      vi.advanceTimersByTime(800);
    });

    expect(onScanComplete).toHaveBeenCalledWith('ABCDE');
  });
});
