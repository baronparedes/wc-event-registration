import { describe, expect, it } from 'vitest';

import {
  calculateAge,
  formatMonthYearDuration,
  fromMonthInput,
  monthsSinceMonthYear,
  toMonthInput,
} from '../utils';

describe('recruitment application date helpers', () => {
  it('calculates age around the birthday boundary', () => {
    expect(calculateAge('2000-11-03', new Date(2026, 10, 2))).toBe(25);
    expect(calculateAge('2000-11-02', new Date(2026, 10, 2))).toBe(26);
    expect(calculateAge('invalid')).toBeNull();
  });

  it('converts between native month inputs and the recruitment month-year format', () => {
    expect(toMonthInput('2024 Sep')).toBe('2024-09');
    expect(fromMonthInput('2024-09')).toBe('2024 Sep');
    expect(toMonthInput(undefined)).toBe('');
    expect(toMonthInput('2024 Nope')).toBe('');
    expect(fromMonthInput('2024-13')).toBe('');
  });

  it('derives DGroup tenure in completed calendar months', () => {
    const today = new Date(2026, 10, 2);
    expect(monthsSinceMonthYear('2026 May', today)).toBe(6);
    expect(monthsSinceMonthYear('not a month', today)).toBeNull();
    expect(monthsSinceMonthYear('2026 Foo', today)).toBeNull();
    expect(formatMonthYearDuration('2024 Nov')).toBe('2 years');
    expect(formatMonthYearDuration('not a month')).toBeNull();
  });

  it('formats singular and mixed month-year durations', () => {
    expect(formatMonthYearDuration('2025 Nov')).toBe('1 year');
    expect(formatMonthYearDuration('2025 Oct')).toBe('1 year and 1 month');
  });
});
