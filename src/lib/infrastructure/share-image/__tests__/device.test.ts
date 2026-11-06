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

    it('returns false for Android Chrome', () => {
      stubNavigator(
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Linux',
        5,
      );
      expect(isSafariOrIOS()).toBe(false);
    });

    it('returns true for iPad Safari', () => {
      stubNavigator(
        'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'MacIntel',
        5,
      );
      expect(isSafariOrIOS()).toBe(true);
    });
  });

  describe('isIOSDevice window and navigator undefined', () => {
    it('returns false when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-expect-error testing undefined case
      delete global.window;
      expect(isIOSDevice()).toBe(false);
      global.window = originalWindow;
    });

    it('returns false when navigator is undefined in isIOSDevice', () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error testing undefined case
      delete global.navigator;
      expect(isIOSDevice()).toBe(false);
      global.navigator = originalNavigator;
    });
  });

  describe('isMobileDevice navigator undefined', () => {
    it('returns false when navigator is undefined', () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error testing undefined case
      delete global.navigator;
      expect(isMobileDevice()).toBe(false);
      global.navigator = originalNavigator;
    });
  });

  describe('isSafariOrIOS navigator undefined', () => {
    it('returns false when navigator is undefined', () => {
      const originalNavigator = global.navigator;
      // @ts-expect-error testing undefined case
      delete global.navigator;
      expect(isSafariOrIOS()).toBe(false);
      global.navigator = originalNavigator;
    });
  });

  describe('isIOSDevice with empty userAgent', () => {
    it('returns false for iPhone when iOS check fails but iPadOS succeeds', () => {
      stubNavigator('', 'MacIntel', 5);
      expect(isIOSDevice()).toBe(true);
    });

    it('returns false for iPhone when both iOS and iPadOS checks fail', () => {
      stubNavigator('', 'Linux', 0);
      expect(isIOSDevice()).toBe(false);
    });
  });

  describe('isMobileDevice edge cases', () => {
    it('returns true for BlackBerry', () => {
      stubNavigator('Mozilla/5.0 (BlackBerry; U; BlackBerry 9930)', 'Linux', 0);
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for Opera Mini', () => {
      stubNavigator('Opera/9.80 (Android 4.4.2; Opera Mini/8.0.1807)', 'Linux', 5);
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for IEMobile', () => {
      stubNavigator(
        'Mozilla/5.0 (compatible; MSIE 10.0; Windows Phone 8.0; Trident/6.0; IEMobile/10.0)',
        'Linux',
        5,
      );
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for webOS', () => {
      stubNavigator('Mozilla/5.0 (webOS/1.4.0)', 'Linux', 0);
      expect(isMobileDevice()).toBe(true);
    });
  });

  describe('isIOSDevice iPad detection', () => {
    it('returns true for iPad user agent', () => {
      stubNavigator('Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', 'MacIntel', 5);
      expect(isIOSDevice()).toBe(true);
    });

    it('returns true for iPod user agent', () => {
      stubNavigator('Mozilla/5.0 (iPod touch; CPU iPhone OS 16_0 like Mac OS X)', 'MacIntel', 5);
      expect(isIOSDevice()).toBe(true);
    });
  });
});
