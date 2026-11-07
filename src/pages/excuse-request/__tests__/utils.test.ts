import { describe, expect, it } from 'vitest';

import {
  EXCUSE_SERVICE_SLOTS,
  formatDateOnly,
  formatServiceSlots,
  formatSundayDisplay,
  getNearestUpcomingSundayString,
  getUpcomingSundays,
  parseDateOnly,
} from '../utils';

describe('excuse-request utils', () => {
  describe('parseDateOnly', () => {
    it('should parse valid YYYY-MM-DD date string', () => {
      const result = parseDateOnly('2024-12-15');
      expect(result).toBeDefined();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(11);
      expect(result?.getDate()).toBe(15);
    });

    it('should return undefined for undefined input', () => {
      expect(parseDateOnly(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseDateOnly('')).toBeUndefined();
    });

    it('should return undefined for invalid date', () => {
      expect(parseDateOnly('2024-02-30')).toBeUndefined();
    });

    it('should handle leap year dates', () => {
      const leapYearDate = parseDateOnly('2024-02-29');
      expect(leapYearDate).toBeDefined();
    });

    it('should reject non-leap year Feb 29', () => {
      expect(parseDateOnly('2023-02-29')).toBeUndefined();
    });
  });

  describe('formatDateOnly', () => {
    it('should format date to YYYY-MM-DD string', () => {
      const date = new Date(2024, 11, 15);
      expect(formatDateOnly(date)).toBe('2024-12-15');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2024, 0, 5);
      expect(formatDateOnly(date)).toBe('2024-01-05');
    });
  });

  describe('formatSundayDisplay', () => {
    it('should format valid date for display', () => {
      const result = formatSundayDisplay('2024-12-15');
      expect(result).not.toBe('Select Sunday date');
      expect(result).toContain('2024');
    });

    it('should return default text for undefined', () => {
      expect(formatSundayDisplay(undefined)).toBe('Select Sunday date');
    });

    it('should return default text for invalid date', () => {
      expect(formatSundayDisplay('invalid')).toBe('Select Sunday date');
    });
  });

  describe('getNearestUpcomingSundayString', () => {
    it('should return a valid date string', () => {
      const result = getNearestUpcomingSundayString();
      const parsed = parseDateOnly(result);
      expect(parsed).toBeDefined();
    });

    it('should return a Sunday', () => {
      const result = getNearestUpcomingSundayString();
      const parsed = parseDateOnly(result);
      expect(parsed?.getDay()).toBe(0);
    });
  });

  describe('getUpcomingSundays', () => {
    it('should return 6 Sundays by default', () => {
      const result = getUpcomingSundays();
      expect(result).toHaveLength(6);
    });

    it('should return custom count when specified', () => {
      expect(getUpcomingSundays(3)).toHaveLength(3);
      expect(getUpcomingSundays(10)).toHaveLength(10);
    });

    it('should mark first as "Upcoming Sunday"', () => {
      const result = getUpcomingSundays(3);
      expect(result[0]?.label).toContain('Upcoming Sunday');
    });

    it('should have all Sundays', () => {
      const result = getUpcomingSundays(4);
      for (const option of result) {
        const date = parseDateOnly(option.value);
        expect(date?.getDay()).toBe(0);
      }
    });
  });

  describe('EXCUSE_SERVICE_SLOTS', () => {
    it('should have 3 slots', () => {
      expect(EXCUSE_SERVICE_SLOTS).toHaveLength(3);
    });

    it('should have all required slots', () => {
      const values = EXCUSE_SERVICE_SLOTS.map((s) => s.value);
      expect(values).toContain('9AM');
      expect(values).toContain('12NN');
      expect(values).toContain('3PM');
    });
  });

  describe('formatServiceSlots', () => {
    it('should format single slot', () => {
      expect(formatServiceSlots(['9AM'])).toBe('9:00 AM');
    });

    it('should format multiple slots comma-separated', () => {
      expect(formatServiceSlots(['9AM', '12NN', '3PM'])).toBe('9:00 AM, 12:00 NN, 3:00 PM');
    });

    it('should handle empty array', () => {
      expect(formatServiceSlots([])).toBe('');
    });

    it('should handle unknown slots', () => {
      const result = formatServiceSlots(['9AM', 'UNKNOWN']);
      expect(result).toContain('9:00 AM');
      expect(result).toContain('UNKNOWN');
    });
  });

  describe('roundtrip conversions', () => {
    it('should parse and format back to same value', () => {
      const original = '2024-12-25';
      const parsed = parseDateOnly(original);
      const formatted = parsed ? formatDateOnly(parsed) : '';
      expect(formatted).toBe(original);
    });
  });
});
