import { describe, expect, it } from 'vitest';

import {
  buildCalendarCells,
  buildMobileWeekCells,
  getMonthWeekRanges,
  isMemberExcused,
  parseServiceSlots,
  toIsoDateKey,
  toMonthDayKey,
} from '../calendar';
import type { ExcusedMemberMap, MilestoneEntry } from '../types';

describe('hub-calendar calendar utils', () => {
  it('formats month and day keys with padding', () => {
    expect(toMonthDayKey(1, 5)).toBe('01-05');
    expect(toMonthDayKey(12, 25)).toBe('12-25');
  });

  it('formats full ISO date keys with padding', () => {
    expect(toIsoDateKey(2026, 9, 5)).toBe('2026-09-05');
    expect(toIsoDateKey(2026, 12, 25)).toBe('2026-12-25');
  });

  describe('parseServiceSlots', () => {
    it('returns all slots for null, undefined, or empty string', () => {
      expect(Array.from(parseServiceSlots(null))).toEqual(['9AM', '12NN', '3PM']);
      expect(Array.from(parseServiceSlots(''))).toEqual(['9AM', '12NN', '3PM']);
      expect(Array.from(parseServiceSlots('   '))).toEqual(['9AM', '12NN', '3PM']);
    });

    it('returns all slots if "all" is present in text', () => {
      expect(Array.from(parseServiceSlots('All Services'))).toEqual(['9AM', '12NN', '3PM']);
      expect(Array.from(parseServiceSlots('ALL'))).toEqual(['9AM', '12NN', '3PM']);
    });

    it('parses comma-separated service slots case-insensitively', () => {
      const slots = parseServiceSlots('9am, 12nn');
      expect(slots.has('9AM')).toBe(true);
      expect(slots.has('12NN')).toBe(true);
      expect(slots.has('3PM')).toBe(false);
    });

    it('parses single slot or formatted strings like 9:00AM', () => {
      const slots = parseServiceSlots('9:00 AM');
      expect(slots.has('9AM')).toBe(true);
      expect(slots.has('12NN')).toBe(false);
    });

    it('parses 3PM slot', () => {
      const slots = parseServiceSlots('3pm');
      expect(slots.has('3PM')).toBe(true);
      expect(slots.has('9AM')).toBe(false);
    });
  });

  it('ensures every week starts on a Monday and ends on a Sunday with 7 days', () => {
    for (let month = 0; month < 12; month++) {
      const weeks = getMonthWeekRanges(2026, month);
      expect(weeks.length).toBeGreaterThanOrEqual(4);
      expect(weeks.length).toBeLessThanOrEqual(6);

      weeks.forEach((w, index) => {
        expect(w.weekNumber).toBe(index + 1);
        expect(w.days).toHaveLength(7);
        expect(w.days[0].getDay()).toBe(1); // Monday
        expect(w.days[6].getDay()).toBe(0); // Sunday
        expect(w.endDate.getDay()).toBe(0);
      });
    }
  });

  it('builds calendar cells for a month with 42 cells, correct Sunday keys, and isoDate', () => {
    const cells = buildCalendarCells(2026, 8); // Sep 2026
    expect(cells).toHaveLength(42);

    const currentMonthCells = cells.filter((c) => c.isCurrentMonth);
    expect(currentMonthCells).toHaveLength(30);
    expect(currentMonthCells[0].isoDate).toBe('2026-09-01');

    const sundays = currentMonthCells.filter((c) => c.isSunday);
    expect(sundays).toHaveLength(4);
    expect(sundays[0].sundayKey).toBe('first_sunday');
    expect(sundays[0].isoDate).toBe('2026-09-06');
    expect(sundays[1].sundayKey).toBe('second_sunday');
    expect(sundays[2].sundayKey).toBe('third_sunday');
    expect(sundays[3].sundayKey).toBe('fourth_sunday');
  });

  it('builds mobile week cells filtering only days within target month with isoDate', () => {
    const weeks = getMonthWeekRanges(2026, 8); // Sep 2026
    const week1 = weeks[0]; // Aug 31 to Sep 6

    const scheduleMap = new Map();
    const milestoneMap = new Map<string, MilestoneEntry[]>();

    const mobileCells = buildMobileWeekCells(week1, 2026, 8, scheduleMap, milestoneMap);
    // Aug 31 should be filtered out because it's not month index 8
    expect(mobileCells).toHaveLength(6);
    expect(mobileCells[0].monthDayKey).toBe('09-01');
    expect(mobileCells[0].isoDate).toBe('2026-09-01');
    expect(mobileCells[5].isSunday).toBe(true);
    expect(mobileCells[5].sundayKey).toBe('first_sunday');
    expect(mobileCells[5].isoDate).toBe('2026-09-06');
  });

  describe('isMemberExcused', () => {
    const excusedMap: ExcusedMemberMap = new Map([
      [
        '2026-09-20',
        new Map([
          ['mem-001', new Set(['9AM'])],
          ['550e8400-e29b-41d4-a716-446655440000', new Set(['9AM', '12NN'])],
          ['mem-all', new Set(['9AM', '12NN', '3PM'])],
        ]),
      ],
    ]);

    it('matches by member_id string in day view (without serviceSlot)', () => {
      expect(
        isMemberExcused(excusedMap, '2026-09-20', {
          id: 'other-id',
          member_id: 'MEM-001',
        }),
      ).toBe(true);
    });

    it('matches by member_id case-insensitively and with whitespace', () => {
      expect(
        isMemberExcused(excusedMap, '2026-09-20', {
          id: 'other-id',
          member_id: '  mem-001  ',
        }),
      ).toBe(true);
    });

    it('matches by user UUID (id)', () => {
      expect(
        isMemberExcused(excusedMap, '2026-09-20', {
          id: '550e8400-e29b-41d4-a716-446655440000',
          member_id: 'DIFFERENT-CODE',
        }),
      ).toBe(true);
    });

    it('evaluates specific serviceSlot correctly in slot view', () => {
      // mem-001 is only excused for 9AM
      expect(
        isMemberExcused(excusedMap, '2026-09-20', { id: 'other-id', member_id: 'MEM-001' }, '9AM'),
      ).toBe(true);

      expect(
        isMemberExcused(excusedMap, '2026-09-20', { id: 'other-id', member_id: 'MEM-001' }, '12NN'),
      ).toBe(false);

      expect(
        isMemberExcused(excusedMap, '2026-09-20', { id: 'other-id', member_id: 'MEM-001' }, '3PM'),
      ).toBe(false);

      // UUID user is excused for 9AM and 12NN, but not 3PM
      expect(
        isMemberExcused(
          excusedMap,
          '2026-09-20',
          { id: '550e8400-e29b-41d4-a716-446655440000', member_id: 'OTHER' },
          '12NN',
        ),
      ).toBe(true);

      expect(
        isMemberExcused(
          excusedMap,
          '2026-09-20',
          { id: '550e8400-e29b-41d4-a716-446655440000', member_id: 'OTHER' },
          '3PM',
        ),
      ).toBe(false);

      // mem-all is excused for all slots
      expect(
        isMemberExcused(excusedMap, '2026-09-20', { id: 'other-id', member_id: 'MEM-ALL' }, '3PM'),
      ).toBe(true);
    });

    it('returns false when member is not excused on that date', () => {
      expect(
        isMemberExcused(excusedMap, '2026-09-20', {
          id: 'unexcused-id',
          member_id: 'UNEXCUSED-MEM',
        }),
      ).toBe(false);
    });

    it('returns false for different dates or missing map', () => {
      expect(
        isMemberExcused(excusedMap, '2026-09-27', {
          id: '550e8400-e29b-41d4-a716-446655440000',
          member_id: 'MEM-001',
        }),
      ).toBe(false);

      expect(
        isMemberExcused(undefined, '2026-09-20', {
          id: '550e8400-e29b-41d4-a716-446655440000',
          member_id: 'MEM-001',
        }),
      ).toBe(false);
    });
  });
});
