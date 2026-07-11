import { describe, expect, it, vi } from 'vitest';

import { formatDateOnly, formatDateTime, localDateTimeToUTC8ISO } from '../dateFormat';

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

  it('converts datetime-local values to UTC+8 ISO and rejects empty inputs', () => {
    expect(localDateTimeToUTC8ISO(undefined)).toBeNull();
    expect(localDateTimeToUTC8ISO('   ')).toBeNull();
    expect(localDateTimeToUTC8ISO('2026-08-15T21:00:00')).toBe('2026-08-15T21:00:00+08:00');
  });
});
