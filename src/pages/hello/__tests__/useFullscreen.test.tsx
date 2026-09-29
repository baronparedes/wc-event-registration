import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFullscreen } from '../hooks/useFullscreen';

describe('useFullscreen', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(document, 'fullscreenElement');
    Reflect.deleteProperty(document, 'exitFullscreen');
    document.querySelector('meta[name="theme-color"]')?.remove();
    document.body.style.overflow = '';
    document.body.style.backgroundColor = '';
    document.documentElement.style.overflow = '';
  });

  it('locks the page in fallback fullscreen mode and restores it on Escape', async () => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'scroll';
    document.body.style.backgroundColor = 'white';
    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#ffffff';
    document.head.appendChild(themeColor);

    const { result } = renderHook(() => useFullscreen());
    await act(async () => result.current.toggleFullscreen());

    expect(result.current.isFullscreen).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.documentElement.style.overflow).toBe('hidden');
    expect(themeColor.content).toBe('#000000');

    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));

    expect(result.current.isFullscreen).toBe(false);
    expect(document.body.style.overflow).toBe('auto');
    expect(document.documentElement.style.overflow).toBe('scroll');
    expect(themeColor.content).toBe('#ffffff');
  });

  it('requests and exits browser fullscreen when supported', async () => {
    const container = document.createElement('div');
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    container.requestFullscreen = requestFullscreen;
    const exitFullscreen = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: container });
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: exitFullscreen,
    });

    const { result } = renderHook(() => useFullscreen());
    act(() => {
      result.current.containerRef.current = container;
    });

    await act(async () => result.current.toggleFullscreen());
    expect(requestFullscreen).toHaveBeenCalledOnce();

    act(() => document.dispatchEvent(new Event('fullscreenchange')));
    expect(result.current.isFullscreen).toBe(true);

    await act(async () => result.current.exitFullscreen());
    expect(exitFullscreen).toHaveBeenCalledOnce();
    expect(result.current.isFullscreen).toBe(false);
  });
});
