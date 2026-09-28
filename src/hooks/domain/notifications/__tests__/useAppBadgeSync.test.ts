import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppBadgeSync } from '../useAppBadgeSync';

describe('useAppBadgeSync', () => {
  const originalTitle = 'Welcome Hub';

  beforeEach(() => {
    vi.clearAllMocks();
    document.title = originalTitle;
  });

  afterEach(() => {
    document.title = originalTitle;
    vi.restoreAllMocks();
  });

  describe('document.title sync', () => {
    it('prefixes document.title with unread count when unreadCount > 0', () => {
      renderHook(() => useAppBadgeSync(3));
      expect(document.title).toBe('(3) Welcome Hub');
    });

    it('reverts document.title to original when unreadCount is 0', () => {
      const { rerender } = renderHook(({ count }) => useAppBadgeSync(count), {
        initialProps: { count: 3 },
      });

      expect(document.title).toBe('(3) Welcome Hub');

      rerender({ count: 0 });
      expect(document.title).toBe('Welcome Hub');
    });

    it('strips existing badge prefix when capturing initial document title', () => {
      document.title = '(5) Welcome Hub';
      const { rerender } = renderHook(({ count }) => useAppBadgeSync(count), {
        initialProps: { count: 2 },
      });

      expect(document.title).toBe('(2) Welcome Hub');

      rerender({ count: 0 });
      expect(document.title).toBe('Welcome Hub');
    });
  });

  describe('Badging API sync', () => {
    it('calls navigator.setAppBadge when unreadCount > 0', () => {
      const setAppBadge = vi.fn().mockResolvedValue(undefined);
      const clearAppBadge = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, 'setAppBadge', {
        value: setAppBadge,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'clearAppBadge', {
        value: clearAppBadge,
        writable: true,
        configurable: true,
      });

      renderHook(() => useAppBadgeSync(4));

      expect(setAppBadge).toHaveBeenCalledWith(4);
      expect(clearAppBadge).not.toHaveBeenCalled();
    });

    it('calls navigator.clearAppBadge when unreadCount is 0', () => {
      const setAppBadge = vi.fn().mockResolvedValue(undefined);
      const clearAppBadge = vi.fn().mockResolvedValue(undefined);

      Object.defineProperty(navigator, 'setAppBadge', {
        value: setAppBadge,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'clearAppBadge', {
        value: clearAppBadge,
        writable: true,
        configurable: true,
      });

      renderHook(() => useAppBadgeSync(0));

      expect(clearAppBadge).toHaveBeenCalled();
      expect(setAppBadge).not.toHaveBeenCalled();
    });

    it('handles setAppBadge / clearAppBadge rejection gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const setAppBadge = vi.fn().mockRejectedValue(new Error('Permission denied'));
      const clearAppBadge = vi.fn().mockRejectedValue(new Error('Permission denied'));

      Object.defineProperty(navigator, 'setAppBadge', {
        value: setAppBadge,
        writable: true,
        configurable: true,
      });
      Object.defineProperty(navigator, 'clearAppBadge', {
        value: clearAppBadge,
        writable: true,
        configurable: true,
      });

      expect(() => {
        renderHook(() => useAppBadgeSync(2));
      }).not.toThrow();

      expect(() => {
        renderHook(() => useAppBadgeSync(0));
      }).not.toThrow();

      // Allow microtasks to settle
      await Promise.resolve();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it('does not throw when Badging API is not supported in navigator', () => {
      // @ts-expect-error - delete property to test unsupported environments
      delete navigator.setAppBadge;
      // @ts-expect-error - delete property to test unsupported environments
      delete navigator.clearAppBadge;

      expect(() => {
        renderHook(() => useAppBadgeSync(3));
      }).not.toThrow();
    });
  });

  describe('Service Worker CLEAR_NOTIFICATIONS message', () => {
    it('posts CLEAR_NOTIFICATIONS to serviceWorker controller on focus/visibility change', () => {
      const postMessage = vi.fn();
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          controller: {
            postMessage,
          },
        },
        writable: true,
        configurable: true,
      });

      const { unmount } = renderHook(() => useAppBadgeSync(0));

      // Initial mount check (when document is visible)
      expect(postMessage).toHaveBeenCalledWith({ type: 'CLEAR_NOTIFICATIONS' });

      postMessage.mockClear();

      // Trigger focus event
      window.dispatchEvent(new Event('focus'));
      expect(postMessage).toHaveBeenCalledWith({ type: 'CLEAR_NOTIFICATIONS' });

      postMessage.mockClear();

      // Trigger visibilitychange event
      document.dispatchEvent(new Event('visibilitychange'));
      expect(postMessage).toHaveBeenCalledWith({ type: 'CLEAR_NOTIFICATIONS' });

      // Unmount should clean up listeners
      unmount();
      postMessage.mockClear();

      window.dispatchEvent(new Event('focus'));
      expect(postMessage).not.toHaveBeenCalled();
    });
  });
});
