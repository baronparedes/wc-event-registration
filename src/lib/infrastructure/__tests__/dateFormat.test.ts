import { describe, expect, it, vi } from 'vitest';

import {
  formatDateOnly,
  formatDateTime,
  formatDayMonth,
  formatTimeOnly,
  localDateTimeToUTC8ISO,
} from '../dateFormat';

describe('dateFormat', () => {
  it('formats valid dates and returns fallbacks for empty or invalid values', () => {
    const dateOnlySpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('Jun 23, 2026');
    const dateTimeSpy = vi
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('Jun 23, 2026, 2:30 PM');

    expect(formatDateOnly('2026-06-23T00:00:00.000Z')).toBe('Jun 23, 2026');
    expect(formatDateOnly(null)).toBe('—');
    expect(formatDateOnly('not-a-date')).toBe('—');

    expect(formatDateTime('2026-06-23T14:30:00.000Z')).toBe('Jun 23, 2026, 2:30 PM');
    expect(formatDateTime(null)).toBe('TBD');
    expect(formatDateTime('not-a-date')).toBe('TBD');

    dateOnlySpy.mockRestore();
    dateTimeSpy.mockRestore();
  });

  it('formats time-only in Asia/Manila (UTC+8) and returns fallbacks', () => {
    expect(formatTimeOnly('2026-01-04T00:45:00.000Z')).toBe('8:45 AM');
    expect(formatTimeOnly('2026-01-04T04:00:00.000Z')).toBe('12:00 PM');
    expect(formatTimeOnly('2026-01-04T07:15:00.000Z')).toBe('3:15 PM');
    expect(formatTimeOnly(null)).toBe('—');
    expect(formatTimeOnly('not-a-date')).toBe('—');
  });

  it('converts datetime-local values to UTC+8 ISO and rejects empty inputs', () => {
    expect(localDateTimeToUTC8ISO(undefined)).toBeNull();
    expect(localDateTimeToUTC8ISO('   ')).toBeNull();
    expect(localDateTimeToUTC8ISO('2026-08-15T21:00:00')).toBe('2026-08-15T21:00:00+08:00');
  });

  it('formats day-month values and returns fallbacks for empty or invalid values', () => {
    const dayMonthSpy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('15 Jun');

    expect(formatDayMonth('2026-06-15T00:00:00.000Z')).toBe('15 Jun');
    expect(formatDayMonth(null)).toBe('—');
    expect(formatDayMonth('not-a-date')).toBe('—');

    dayMonthSpy.mockRestore();
  });
});
