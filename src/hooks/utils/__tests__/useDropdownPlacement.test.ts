import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDropdownPlacement } from '../useDropdownPlacement';

describe('useDropdownPlacement', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    });
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('defaults to opensUpward=false when trigger element is not attached', () => {
    const { result } = renderHook(() =>
      useDropdownPlacement({
        isOpen: false,
        optionCount: 5,
        includesPlaceholder: true,
      }),
    );

    expect(result.current.opensUpward).toBe(false);
  });

  it('detects button trigger and calculates downward when sufficient space below exists on desktop', () => {
    const { result } = renderHook(() =>
      useDropdownPlacement({
        isOpen: true,
        optionCount: 5,
        includesPlaceholder: true,
      }),
    );

    // Create container and button trigger
    const container = document.createElement('div');
    const button = document.createElement('button');
    container.appendChild(button);
    document.body.appendChild(container);

    // Mock bounding rect: button is at top (y: 100, bottom: 140, available below: 660px, above: 100px)
    button.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 100,
      bottom: 140,
      left: 0,
      right: 200,
      width: 200,
      height: 40,
    });

    Object.defineProperty(result.current.containerRef, 'current', {
      value: container,
      writable: true,
    });

    act(() => {
      result.current.prepareOpenDirection();
    });

    expect(result.current.opensUpward).toBe(false);

    document.body.removeChild(container);
  });

  it('detects input trigger and calculates upward when space below is constrained on desktop', () => {
    const { result } = renderHook(() =>
      useDropdownPlacement({
        isOpen: true,
        optionCount: 5,
        includesPlaceholder: true,
      }),
    );

    const container = document.createElement('div');
    const input = document.createElement('input');
    container.appendChild(input);
    document.body.appendChild(container);

    // Input near bottom of screen: top: 650, bottom: 690, available below: 110px, available above: 650px
    input.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 650,
      bottom: 690,
      left: 0,
      right: 200,
      width: 200,
      height: 40,
    });

    Object.defineProperty(result.current.containerRef, 'current', {
      value: container,
      writable: true,
    });

    act(() => {
      result.current.prepareOpenDirection();
    });

    expect(result.current.opensUpward).toBe(true);

    document.body.removeChild(container);
  });

  it('opens upward on mobile viewports when space above is greater than space below', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 700,
    });

    const { result } = renderHook(() =>
      useDropdownPlacement({
        isOpen: true,
        optionCount: 5,
        includesPlaceholder: true,
      }),
    );

    const container = document.createElement('div');
    const input = document.createElement('input');
    container.appendChild(input);
    document.body.appendChild(container);

    // Mobile: top: 400, bottom: 440 (available above: 400px > available below: 260px)
    input.getBoundingClientRect = vi.fn().mockReturnValue({
      top: 400,
      bottom: 440,
      left: 0,
      right: 350,
      width: 350,
      height: 40,
    });

    Object.defineProperty(result.current.containerRef, 'current', {
      value: container,
      writable: true,
    });

    act(() => {
      result.current.prepareOpenDirection();
    });

    expect(result.current.opensUpward).toBe(true);

    document.body.removeChild(container);
  });

  it('attaches and removes resize and scroll event listeners when isOpen changes', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { rerender, unmount } = renderHook(
      ({ isOpen }) =>
        useDropdownPlacement({
          isOpen,
          optionCount: 5,
          includesPlaceholder: true,
        }),
      { initialProps: { isOpen: false } },
    );

    expect(addEventListenerSpy).not.toHaveBeenCalledWith('resize', expect.any(Function));

    rerender({ isOpen: true });

    expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
  });
});
