import { describe, expect, it } from 'vitest';

import { parseRelativeDateLiteral } from '../parsing';

describe('parseRelativeDateLiteral', () => {
  it('returns null for empty or whitespace input', () => {
    expect(parseRelativeDateLiteral('')).toBeNull();
    expect(parseRelativeDateLiteral('   ')).toBeNull();
  });

  describe('UPCOMING_*', () => {
    it('parses valid weekdays', () => {
      expect(parseRelativeDateLiteral('UPCOMING_SUNDAY')).toEqual({
        kind: 'upcomingWeekday',
        weekday: 0,
      });
      expect(parseRelativeDateLiteral('UPCOMING_MONDAY')).toEqual({
        kind: 'upcomingWeekday',
        weekday: 1,
      });
      expect(parseRelativeDateLiteral('UPCOMING_SATURDAY')).toEqual({
        kind: 'upcomingWeekday',
        weekday: 6,
      });
    });

    it('returns null for invalid weekdays', () => {
      expect(parseRelativeDateLiteral('UPCOMING_FUNDAY')).toBeNull();
      expect(parseRelativeDateLiteral('UPCOMING_')).toBeNull();
    });
  });

  describe('MONTH_*', () => {
    it('parses valid months', () => {
      expect(parseRelativeDateLiteral('MONTH_JANUARY')).toEqual({ kind: 'month', month: 0 });
      expect(parseRelativeDateLiteral('MONTH_DECEMBER')).toEqual({ kind: 'month', month: 11 });
    });

    it('returns null for invalid months', () => {
      expect(parseRelativeDateLiteral('MONTH_XYZ')).toBeNull();
      expect(parseRelativeDateLiteral('MONTH_')).toBeNull();
    });
  });

  describe('YEAR_MONTH_*', () => {
    it('parses valid year and month', () => {
      expect(parseRelativeDateLiteral('YEAR_MONTH_2023_MARCH')).toEqual({
        kind: 'yearMonth',
        year: 2023,
        month: 2,
      });
    });

    it('returns null for invalid year or month', () => {
      expect(parseRelativeDateLiteral('YEAR_MONTH_20_MARCH')).toBeNull();
      expect(parseRelativeDateLiteral('YEAR_MONTH_2023_XYZ')).toBeNull();
      expect(parseRelativeDateLiteral('YEAR_MONTH_2023_')).toBeNull();
    });
  });

  describe('YEAR_*', () => {
    it('parses valid year', () => {
      expect(parseRelativeDateLiteral('YEAR_2024')).toEqual({ kind: 'year', year: 2024 });
    });

    it('returns null for invalid year', () => {
      expect(parseRelativeDateLiteral('YEAR_20')).toBeNull();
      expect(parseRelativeDateLiteral('YEAR_ABCD')).toBeNull();
    });
  });

  describe('PREVIOUS_*_WEEKS', () => {
    it('parses valid weeks', () => {
      expect(parseRelativeDateLiteral('PREVIOUS_4_WEEKS')).toEqual({
        kind: 'previousWeeks',
        weeks: 4,
      });
      expect(parseRelativeDateLiteral('PREVIOUS_12_WEEKS')).toEqual({
        kind: 'previousWeeks',
        weeks: 12,
      });
    });

    it('returns null for invalid or zero weeks', () => {
      expect(parseRelativeDateLiteral('PREVIOUS_0_WEEKS')).toBeNull();
      expect(parseRelativeDateLiteral('PREVIOUS_A_WEEKS')).toBeNull();
      expect(parseRelativeDateLiteral('PREVIOUS_-1_WEEKS')).toBeNull();
    });
  });

  it('handles lowercase and padded space inputs correctly', () => {
    expect(parseRelativeDateLiteral(' upcoming_monday ')).toEqual({
      kind: 'upcomingWeekday',
      weekday: 1,
    });
    expect(parseRelativeDateLiteral('  month_january  ')).toEqual({ kind: 'month', month: 0 });
  });

  it('returns null for completely unrecognized tokens', () => {
    expect(parseRelativeDateLiteral('UNKNOWN_LITERAL')).toBeNull();
    expect(parseRelativeDateLiteral('RANDOM_STRING')).toBeNull();
  });
});
