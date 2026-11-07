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

describe('long-leave-request utils', () => {
  describe('parseDateOnly', () => {
    it('should parse valid YYYY-MM-DD date string', () => {
      const result = parseDateOnly('2024-12-15');
      expect(result).toBeDefined();
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(11); // December
      expect(result?.getDate()).toBe(15);
    });

    it('should return undefined for undefined input', () => {
      expect(parseDateOnly(undefined)).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      expect(parseDateOnly('')).toBeUndefined();
    });

    it('should return undefined for string shorter than 10 characters', () => {
      expect(parseDateOnly('2024-12')).toBeUndefined();
    });

    it('should return undefined for invalid date', () => {
      expect(parseDateOnly('2024-02-30')).toBeUndefined(); // February doesn't have 30 days
    });

    it('should return undefined for non-numeric components', () => {
      expect(parseDateOnly('abcd-ef-gh')).toBeUndefined();
    });

    it('should handle edge case: end of month dates correctly', () => {
      const result = parseDateOnly('2024-01-31');
      expect(result).toBeDefined();
      expect(result?.getDate()).toBe(31);
    });

    it('should handle leap year dates', () => {
      const leapYearDate = parseDateOnly('2024-02-29');
      expect(leapYearDate).toBeDefined();
      expect(leapYearDate?.getDate()).toBe(29);
    });

    it('should reject invalid leap year date', () => {
      const nonLeapYearDate = parseDateOnly('2023-02-29');
      expect(nonLeapYearDate).toBeUndefined();
    });
  });

  describe('formatDateOnly', () => {
    it('should format date to YYYY-MM-DD string', () => {
      const date = new Date(2024, 11, 15); // December 15, 2024
      expect(formatDateOnly(date)).toBe('2024-12-15');
    });

    it('should pad single-digit months with zero', () => {
      const date = new Date(2024, 0, 5); // January 5, 2024
      expect(formatDateOnly(date)).toBe('2024-01-05');
    });

    it('should pad single-digit days with zero', () => {
      const date = new Date(2024, 11, 5); // December 5, 2024
      expect(formatDateOnly(date)).toBe('2024-12-05');
    });

    it('should handle month boundaries correctly', () => {
      const lastDayOfMonth = new Date(2024, 0, 31); // January 31, 2024
      expect(formatDateOnly(lastDayOfMonth)).toBe('2024-01-31');
    });
  });

  describe('formatSundayDisplay', () => {
    it('should format valid Sunday date string for display', () => {
      const result = formatSundayDisplay('2024-12-15');
      expect(result).toContain('2024');
      expect(result).not.toBe('Select Sunday date');
    });

    it('should return default text for undefined input', () => {
      expect(formatSundayDisplay(undefined)).toBe('Select Sunday date');
    });

    it('should return default text for empty string', () => {
      expect(formatSundayDisplay('')).toBe('Select Sunday date');
    });

    it('should return default text for invalid date', () => {
      expect(formatSundayDisplay('invalid-date')).toBe('Select Sunday date');
    });

    it('should format date in US locale', () => {
      const result = formatSundayDisplay('2024-12-15');
      // Check that it contains expected English month/day names
      expect(result.length).toBeGreaterThan(0);
      expect(/\d{4}/.test(result)).toBe(true); // Contains year
    });
  });

  describe('getNearestUpcomingSundayString', () => {
    it('should return a valid date string in YYYY-MM-DD format', () => {
      const result = getNearestUpcomingSundayString();
      const parsed = parseDateOnly(result);
      expect(parsed).toBeDefined();
    });

    it('should return a date on Sunday', () => {
      const result = getNearestUpcomingSundayString();
      const parsed = parseDateOnly(result);
      expect(parsed?.getDay()).toBe(0); // 0 is Sunday
    });

    it('should return upcoming or today if today is Sunday', () => {
      const result = getNearestUpcomingSundayString();
      const resultDate = parseDateOnly(result);
      const today = new Date();
      const resultTime = resultDate?.getTime() ?? 0;
      const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

      expect(resultTime).toBeGreaterThanOrEqual(todayTime);
    });

    it('should not return a past date', () => {
      const result = getNearestUpcomingSundayString();
      const resultDate = parseDateOnly(result);
      const today = new Date();
      const todayAtMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      expect(resultDate?.getTime()).toBeGreaterThanOrEqual(todayAtMidnight.getTime());
    });
  });

  describe('getUpcomingSundays', () => {
    it('should return array of upcoming Sundays with default count of 6', () => {
      const result = getUpcomingSundays();
      expect(result).toHaveLength(6);
    });

    it('should return custom count of Sundays when specified', () => {
      const result = getUpcomingSundays(3);
      expect(result).toHaveLength(3);

      const result2 = getUpcomingSundays(10);
      expect(result2).toHaveLength(10);
    });

    it('should have correct structure for each Sunday option', () => {
      const result = getUpcomingSundays(1);
      const option = result[0];

      expect(option).toBeDefined();
      expect(option?.value).toBeDefined();
      expect(option?.label).toBeDefined();
      expect(option?.formattedDate).toBeDefined();
      expect(/\d{4}-\d{2}-\d{2}/.test(option?.value || '')).toBe(true);
    });

    it('should have all Sundays, spaced 7 days apart', () => {
      const result = getUpcomingSundays(4);

      for (let i = 0; i < result.length - 1; i++) {
        const current = parseDateOnly(result[i]?.value);
        const next = parseDateOnly(result[i + 1]?.value);

        expect(current).toBeDefined();
        expect(next).toBeDefined();

        const daysDiff = (next?.getTime() ?? 0) - (current?.getTime() ?? 0);
        expect(daysDiff).toBe(7 * 24 * 60 * 60 * 1000); // Exactly 7 days
      }
    });

    it('should mark first Sunday as "Upcoming Sunday"', () => {
      const result = getUpcomingSundays(3);
      expect(result[0]?.label).toContain('Upcoming Sunday');
    });

    it('should not mark subsequent Sundays as "Upcoming Sunday"', () => {
      const result = getUpcomingSundays(3);
      for (let i = 1; i < result.length; i++) {
        expect(result[i]?.label).not.toContain('Upcoming Sunday');
      }
    });

    it('should have all Sundays on actual Sunday day of week', () => {
      const result = getUpcomingSundays(4);

      for (const option of result) {
        const date = parseDateOnly(option.value);
        expect(date?.getDay()).toBe(0); // 0 = Sunday
      }
    });
  });

  describe('EXCUSE_SERVICE_SLOTS', () => {
    it('should have 3 service slots', () => {
      expect(EXCUSE_SERVICE_SLOTS).toHaveLength(3);
    });

    it('should have 9AM slot', () => {
      const slot = EXCUSE_SERVICE_SLOTS.find((s) => s.value === '9AM');
      expect(slot).toBeDefined();
      expect(slot?.label).toBe('9:00 AM');
    });

    it('should have 12NN slot', () => {
      const slot = EXCUSE_SERVICE_SLOTS.find((s) => s.value === '12NN');
      expect(slot).toBeDefined();
      expect(slot?.label).toBe('12:00 NN');
    });

    it('should have 3PM slot', () => {
      const slot = EXCUSE_SERVICE_SLOTS.find((s) => s.value === '3PM');
      expect(slot).toBeDefined();
      expect(slot?.label).toBe('3:00 PM');
    });
  });

  describe('formatServiceSlots', () => {
    it('should format single slot', () => {
      const result = formatServiceSlots(['9AM']);
      expect(result).toBe('9:00 AM');
    });

    it('should format multiple slots comma-separated', () => {
      const result = formatServiceSlots(['9AM', '12NN', '3PM']);
      expect(result).toBe('9:00 AM, 12:00 NN, 3:00 PM');
    });

    it('should format two slots', () => {
      const result = formatServiceSlots(['9AM', '3PM']);
      expect(result).toBe('9:00 AM, 3:00 PM');
    });

    it('should handle unknown slot codes', () => {
      const result = formatServiceSlots(['9AM', 'UNKNOWN', '3PM']);
      expect(result).toContain('9:00 AM');
      expect(result).toContain('UNKNOWN');
      expect(result).toContain('3:00 PM');
    });

    it('should handle empty array', () => {
      const result = formatServiceSlots([]);
      expect(result).toBe('');
    });
  });

  describe('roundtrip conversions', () => {
    it('should parse and format back to same value', () => {
      const original = '2024-12-25';
      const parsed = parseDateOnly(original);
      const formatted = parsed ? formatDateOnly(parsed) : '';

      expect(formatted).toBe(original);
    });

    it('should handle various valid dates', () => {
      const testDates = ['2024-01-01', '2024-06-15', '2024-12-31', '2025-02-28'];

      for (const dateString of testDates) {
        const parsed = parseDateOnly(dateString);
        const formatted = parsed ? formatDateOnly(parsed) : '';
        expect(formatted).toBe(dateString);
      }
    });
  });
});
