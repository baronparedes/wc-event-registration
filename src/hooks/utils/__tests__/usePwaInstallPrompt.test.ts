import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PWA_INSTALLED_STORAGE_KEY,
  isIOSDevice,
  isStandaloneMode,
  usePwaInstallPrompt,
} from '../usePwaInstallPrompt';

describe('usePwaInstallPrompt and helpers', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('isStandaloneMode', () => {
    it('returns true when display-mode: standalone matches', () => {
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(isStandaloneMode()).toBe(true);
    });

    it('returns true when iOS navigator.standalone is true', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      Object.defineProperty(window.navigator, 'standalone', {
        value: true,
        configurable: true,
      });

      expect(isStandaloneMode()).toBe(true);
    });

    it('returns false in standard browser mode', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      Object.defineProperty(window.navigator, 'standalone', {
        value: false,
        configurable: true,
      });

      expect(isStandaloneMode()).toBe(false);
    });
  });

  describe('isIOSDevice', () => {
    it('returns true for iPhone user agent', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        configurable: true,
      });

      expect(isIOSDevice()).toBe(true);
    });

    it('returns true for iPadOS with MacIntel and multi-touch', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        configurable: true,
      });
      Object.defineProperty(window.navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });

      expect(isIOSDevice()).toBe(true);
    });

    it('returns false for desktop chrome', () => {
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
        configurable: true,
      });
      Object.defineProperty(window.navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });
      Object.defineProperty(window.navigator, 'maxTouchPoints', {
        value: 0,
        configurable: true,
      });

      expect(isIOSDevice()).toBe(false);
    });
  });

  describe('usePwaInstallPrompt hook', () => {
    it('captures beforeinstallprompt event and allows installation', async () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      Object.defineProperty(window.navigator, 'standalone', { value: false, configurable: true });

      const { result } = renderHook(() => usePwaInstallPrompt());

      expect(result.current.canInstall).toBe(false);
      expect(result.current.hasNativePrompt).toBe(false);

      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockEvent = new Event('beforeinstallprompt');
      Object.assign(mockEvent, {
        platforms: ['web'],
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'accepted', platform: 'web' }),
      });

      act(() => {
        window.dispatchEvent(mockEvent);
      });

      expect(result.current.canInstall).toBe(true);
      expect(result.current.hasNativePrompt).toBe(true);

      let installResult;
      await act(async () => {
        installResult = await result.current.promptToInstall();
      });

      expect(mockPrompt).toHaveBeenCalled();
      expect(installResult).toEqual({ outcome: 'accepted' });
      expect(result.current.isAppInstalled).toBe(true);
      expect(localStorage.getItem(PWA_INSTALLED_STORAGE_KEY)).toContain('true');
    });

    it('handles dismissed user choice on native prompt', async () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      Object.defineProperty(window.navigator, 'standalone', { value: false, configurable: true });

      const { result } = renderHook(() => usePwaInstallPrompt());

      const mockPrompt = vi.fn().mockResolvedValue(undefined);
      const mockEvent = new Event('beforeinstallprompt');
      Object.assign(mockEvent, {
        platforms: ['web'],
        prompt: mockPrompt,
        userChoice: Promise.resolve({ outcome: 'dismissed', platform: 'web' }),
      });

      act(() => {
        window.dispatchEvent(mockEvent);
      });

      let installResult;
      await act(async () => {
        installResult = await result.current.promptToInstall();
      });

      expect(mockPrompt).toHaveBeenCalled();
      expect(installResult).toEqual({ outcome: 'dismissed' });
    });

    it('returns manual_guide on iOS when no native prompt exists', async () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      Object.defineProperty(window.navigator, 'standalone', { value: false, configurable: true });
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        configurable: true,
      });

      const { result } = renderHook(() => usePwaInstallPrompt());

      expect(result.current.isIOS).toBe(true);
      expect(result.current.canInstall).toBe(true);

      let installResult;
      await act(async () => {
        installResult = await result.current.promptToInstall();
      });

      expect(installResult).toEqual({ outcome: 'manual_guide' });
    });

    it('handles appinstalled window event', () => {
      window.matchMedia = vi.fn().mockReturnValue({ matches: false });
      Object.defineProperty(window.navigator, 'standalone', { value: false, configurable: true });

      const { result } = renderHook(() => usePwaInstallPrompt());

      act(() => {
        window.dispatchEvent(new Event('appinstalled'));
      });

      expect(result.current.isAppInstalled).toBe(true);
      expect(result.current.canInstall).toBe(false);
      expect(localStorage.getItem(PWA_INSTALLED_STORAGE_KEY)).toContain('true');
    });
  });
});
