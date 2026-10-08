import { describe, expect, it, vi } from 'vitest';

import {
  dataUrlToBlob,
  ensureResourcesReady,
  formatCountdownFilename,
  generateQrCodeDataUrl,
  isMobileDevice,
} from '../shareCountdownUtils';

describe('shareCountdownUtils', () => {
  describe('generateQrCodeDataUrl', () => {
    it('generates a valid data URL containing image/png base64 QR code', async () => {
      const url = 'https://welcomehub.ccf.org.ph/events/tech-summit-2026/countdown';
      const dataUrl = await generateQrCodeDataUrl(url);
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(dataUrl.length).toBeGreaterThan(100);
    });
  });
  describe('isMobileDevice', () => {
    it('returns false for desktop user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 0,
      });
      expect(isMobileDevice()).toBe(false);
    });

    it('returns true for iPhone user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
      });
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for Android user agent', () => {
      vi.stubGlobal('navigator', {
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
        platform: 'Linux armv8l',
        maxTouchPoints: 5,
      });
      expect(isMobileDevice()).toBe(true);
    });

    it('returns true for iPad with desktop UA but maxTouchPoints > 1', () => {
      vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
        maxTouchPoints: 5,
      });
      expect(isMobileDevice()).toBe(true);
    });
  });

  describe('dataUrlToBlob', () => {
    it('converts base64 dataUrl into Blob', () => {
      const dataUrl =
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      const blob = dataUrlToBlob(dataUrl);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/jpeg');
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('formatCountdownFilename', () => {
    it('formats slug into countdown jpg filename', () => {
      expect(formatCountdownFilename('tech-summit-2026')).toBe('tech-summit-2026-countdown.jpg');
      expect(formatCountdownFilename(null)).toBe('event-countdown.jpg');
      expect(formatCountdownFilename('')).toBe('event-countdown.jpg');
      expect(formatCountdownFilename('my event & party!')).toBe('my_event___party_-countdown.jpg');
    });
  });

  describe('ensureResourcesReady', () => {
    it('resolves cleanly even if document.fonts is not defined or images are loaded', async () => {
      const div = document.createElement('div');
      const img = document.createElement('img');
      Object.defineProperty(img, 'complete', { value: true });
      Object.defineProperty(img, 'naturalWidth', { value: 100 });
      div.appendChild(img);

      await expect(ensureResourcesReady(div)).resolves.toBeUndefined();
    });

    it('waits for incomplete images to load or timeout', async () => {
      const div = document.createElement('div');
      const img = document.createElement('img');
      Object.defineProperty(img, 'complete', { value: false });
      Object.defineProperty(img, 'naturalWidth', { value: 0 });
      div.appendChild(img);

      const promise = ensureResourcesReady(div);
      img.dispatchEvent(new Event('load'));
      await expect(promise).resolves.toBeUndefined();
    });
  });
});
