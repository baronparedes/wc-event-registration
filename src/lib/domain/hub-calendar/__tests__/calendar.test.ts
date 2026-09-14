import { describe, expect, it } from 'vitest';

import {
  buildCalendarCells,
  buildMobileWeekCells,
  getMonthWeekRanges,
  toMonthDayKey,
} from '../calendar';
import type { MilestoneEntry } from '../types';

describe('hub-calendar calendar utils', () => {
  it('formats month and day keys with padding', () => {
    expect(toMonthDayKey(1, 5)).toBe('01-05');
    expect(toMonthDayKey(12, 25)).toBe('12-25');
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

  it('builds calendar cells for a month with 42 cells and correct Sunday keys', () => {
    const cells = buildCalendarCells(2026, 8); // Sep 2026
    expect(cells).toHaveLength(42);

    const currentMonthCells = cells.filter((c) => c.isCurrentMonth);
    expect(currentMonthCells).toHaveLength(30);

    const sundays = currentMonthCells.filter((c) => c.isSunday);
    expect(sundays).toHaveLength(4);
    expect(sundays[0].sundayKey).toBe('first_sunday');
    expect(sundays[1].sundayKey).toBe('second_sunday');
    expect(sundays[2].sundayKey).toBe('third_sunday');
    expect(sundays[3].sundayKey).toBe('fourth_sunday');
  });

  it('builds mobile week cells filtering only days within the target month', () => {
    const weeks = getMonthWeekRanges(2026, 8); // Sep 2026
    const week1 = weeks[0]; // Aug 31 to Sep 6

    const scheduleMap = new Map();
    const milestoneMap = new Map<string, MilestoneEntry[]>();

    const mobileCells = buildMobileWeekCells(week1, 2026, 8, scheduleMap, milestoneMap);
    // Aug 31 should be filtered out because it's not month index 8
    expect(mobileCells).toHaveLength(6);
    expect(mobileCells[0].monthDayKey).toBe('09-01');
    expect(mobileCells[5].isSunday).toBe(true);
    expect(mobileCells[5].sundayKey).toBe('first_sunday');
  });
});
