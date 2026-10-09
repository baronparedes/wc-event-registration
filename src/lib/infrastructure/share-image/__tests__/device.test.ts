import { afterEach, describe, expect, it, vi } from 'vitest';

import { isIOSDevice, isMobileDevice, isSafariOrIOS } from '../device';

function stubNavigator(userAgent: string, platform: string, maxTouchPoints: number) {
  vi.stubGlobal('navigator', { userAgent, platform, maxTouchPoints });
}

describe('device', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('isMobileDevice', () => {
    it('returns false for desktop user agent', () => {
      stubNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0);
      expect(isMobileDevice()).toBe(false);
    });

    it('returns true for iPhone user agent', () => {
      stubNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', 'iPhone', 5);
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for Android user agent', () => {
      stubNavigator('Mozilla/5.0 (Linux; Android 13; Pixel 7) Mobile Safari/537.36', 'Linux', 5);
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for iPad with desktop UA but maxTouchPoints > 1', () => {
      stubNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5);
      expect(isMobileDevice()).toBe(true);
    });
  });

  describe('isIOSDevice', () => {
    it('returns true for iPhone user agent', () => {
      stubNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', 'iPhone', 5);
      expect(isIOSDevice()).toBe(true);
    });

    it('returns true for iPadOS desktop-class user agent', () => {
      stubNavigator('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5);
      expect(isIOSDevice()).toBe(true);
    });

    it('returns false for Android', () => {
      stubNavigator('Mozilla/5.0 (Linux; Android 13; Pixel 7)', 'Linux', 5);
      expect(isIOSDevice()).toBe(false);
    });
  });

  describe('isSafariOrIOS', () => {
    it('returns true for iPhone', () => {
      stubNavigator('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)', 'iPhone', 5);
      expect(isSafariOrIOS()).toBe(true);
    });

    it('returns true for macOS Safari', () => {
      stubNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'MacIntel',
        0,
      );
      expect(isSafariOrIOS()).toBe(true);
    });

    it('returns false for macOS Chrome', () => {
      stubNavigator(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'MacIntel',
        0,
      );
      expect(isSafariOrIOS()).toBe(false);
    });
  });
});
