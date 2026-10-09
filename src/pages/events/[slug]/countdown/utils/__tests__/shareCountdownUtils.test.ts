import { describe, expect, it } from 'vitest';

import {
  formatCountdownFilename,
  formatEventSchedule,
  generateQrCodeDataUrl,
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

  describe('formatCountdownFilename', () => {
    it('formats slug into countdown jpg filename', () => {
      expect(formatCountdownFilename('tech-summit-2026')).toBe('tech-summit-2026-countdown.jpg');
      expect(formatCountdownFilename(null)).toBe('event-countdown.jpg');
      expect(formatCountdownFilename('')).toBe('event-countdown.jpg');
      expect(formatCountdownFilename('my event & party!')).toBe('my_event___party_-countdown.jpg');
    });
  });

  describe('formatEventSchedule', () => {
    it('returns Date TBA when startsAt is missing or invalid', () => {
      expect(formatEventSchedule(null, null)).toBe('Date TBA');
      expect(formatEventSchedule(undefined, undefined)).toBe('Date TBA');
      expect(formatEventSchedule('invalid-date', null)).toBe('Date TBA');
    });

    it('formats single date when endsAt is not provided', () => {
      const startsAt = '2026-11-21T12:00:00.000Z';
      const formatted = formatEventSchedule(startsAt, null);
      expect(formatted).toBeTruthy();
      expect(formatted).not.toBe('Date TBA');
    });

    it('formats same-day time range with start and end times', () => {
      // 12:00 to 16:00 UTC+8 on same calendar day
      const startsAt = '2026-11-21T04:00:00.000Z';
      const endsAt = '2026-11-21T08:00:00.000Z';
      const formatted = formatEventSchedule(startsAt, endsAt);
      expect(formatted).toContain('–');
      expect(formatted).toContain('PM');
    });

    it('formats multi-day time range when start and end dates are on different days', () => {
      const startsAt = '2026-11-21T04:00:00.000Z';
      const endsAt = '2026-11-23T08:00:00.000Z';
      const formatted = formatEventSchedule(startsAt, endsAt);
      expect(formatted).toContain('–');
    });
  });
});
