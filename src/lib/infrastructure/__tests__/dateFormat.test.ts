import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  formatDateOnly,
  formatDateTime,
  formatDayMonth,
  formatTimeOnly,
  localDateTimeToUTC8ISO,
} from '../dateFormat';

describe('dateFormat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Setting system time isn't strictly necessary if we only format specific strings,
    // but useful for consistent date operations. We rely mostly on setting a specific
    // locale/timezone behavior.
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('formatDateOnly', () => {
    it('returns formatted date correctly for a valid ISO string', () => {
      // 2026-06-23T12:00:00Z is 2026-06-23T20:00:00 in Asia/Manila (UTC+8)
      // Mock toLocaleDateString to ensure CI consistency regardless of system locale
      const spy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('Jun 23, 2026');

      const result = formatDateOnly('2026-06-23T12:00:00Z');
      expect(result).toBe('Jun 23, 2026');
      expect(spy).toHaveBeenCalledWith(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Manila',
      });
    });

    it('returns the fallback value for null input', () => {
      expect(formatDateOnly(null)).toBe('—');
      expect(formatDateOnly(null, 'N/A')).toBe('N/A');
    });

    it('returns the fallback value for an invalid date string', () => {
      expect(formatDateOnly('invalid-date')).toBe('—');
    });
  });

  describe('formatDayMonth', () => {
    it('returns formatted short day/month for a valid ISO string', () => {
      const spy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('Jun 23');

      const result = formatDayMonth('2026-06-23T12:00:00Z');
      expect(result).toBe('Jun 23');
      expect(spy).toHaveBeenCalledWith(undefined, {
        day: '2-digit',
        month: 'short',
        timeZone: 'Asia/Manila',
      });
    });

    it('returns the fallback value for null input', () => {
      expect(formatDayMonth(null)).toBe('—');
    });

    it('returns the fallback value for an invalid date string', () => {
      expect(formatDayMonth('invalid-date')).toBe('—');
    });
  });

  describe('formatDateTime', () => {
    it('returns localized datetime string for valid input', () => {
      const spy = vi
        .spyOn(Date.prototype, 'toLocaleString')
        .mockReturnValue('Jun 23, 2026, 2:30 PM');

      const result = formatDateTime('2026-06-23T06:30:00Z');
      expect(result).toBe('Jun 23, 2026, 2:30 PM');
      expect(spy).toHaveBeenCalledWith(undefined, { timeZone: 'Asia/Manila' });
    });

    it('handles fallback for null input', () => {
      expect(formatDateTime(null)).toBe('TBD');
      expect(formatDateTime(null, 'N/A')).toBe('N/A');
    });

    it('handles fallback for invalid date strings', () => {
      expect(formatDateTime('invalid')).toBe('TBD');
    });
  });

  describe('formatTimeOnly', () => {
    it('returns formatted time for valid inputs', () => {
      const spy = vi.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('8:45 AM');

      const result = formatTimeOnly('2026-06-23T00:45:00Z');
      expect(result).toBe('8:45 AM');
      expect(spy).toHaveBeenCalledWith('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Manila',
      });
    });

    it('handles fallback appropriately for null input', () => {
      expect(formatTimeOnly(null)).toBe('—');
    });

    it('handles fallback for invalid strings', () => {
      expect(formatTimeOnly('invalid')).toBe('—');
    });
  });

  describe('localDateTimeToUTC8ISO', () => {
    it('correctly appends +08:00 offset to valid YYYY-MM-DDTHH:mm:ss string', () => {
      expect(localDateTimeToUTC8ISO('2026-08-15T21:00:00')).toBe('2026-08-15T21:00:00+08:00');
    });

    it('trims input before formatting', () => {
      expect(localDateTimeToUTC8ISO('  2026-08-15T21:00:00  ')).toBe('2026-08-15T21:00:00+08:00');
    });

    it('returns null for undefined, null, or empty string', () => {
      expect(localDateTimeToUTC8ISO(undefined)).toBe(null);
      expect(localDateTimeToUTC8ISO('')).toBe(null);
      expect(localDateTimeToUTC8ISO('   ')).toBe(null);
    });
  });
});
