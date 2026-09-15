import type { MemberScheduleEntry, SundayKey, TimeSlot } from '@/hooks/domain/members';

import type { CalendarCell, ExcusedMemberMap, MilestoneEntry, WeekCell, WeekRange } from './types';

export const SUNDAY_KEYS: SundayKey[] = [
  'first_sunday',
  'second_sunday',
  'third_sunday',
  'fourth_sunday',
  'fifth_sunday',
];

export function toMonthDayKey(month: number, day: number): string {
  return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

export function toIsoDateKey(year: number, month: number, day: number): string {
  return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

/**
 * Parses a services string (e.g. "9AM, 12NN", "9am", "All") into a set of TimeSlot enum values.
 * Empty text or "All" implies all service slots.
 */
export function parseServiceSlots(servicesText?: string | null): Set<TimeSlot> {
  const slots = new Set<TimeSlot>();
  if (!servicesText || !servicesText.trim()) {
    slots.add('9AM');
    slots.add('12NN');
    slots.add('3PM');
    return slots;
  }

  const normalized = servicesText.toUpperCase();
  if (normalized.includes('ALL')) {
    slots.add('9AM');
    slots.add('12NN');
    slots.add('3PM');
    return slots;
  }

  const tokens = normalized.split(/[,;/]+/).map((t) => t.trim().replace(/\s+/g, ''));
  for (const token of tokens) {
    if (token === '9AM' || token === '9:00AM' || token.startsWith('9AM')) {
      slots.add('9AM');
    }
    if (
      token === '12NN' ||
      token === '12:00NN' ||
      token === '12PM' ||
      token === '12:00PM' ||
      token.startsWith('12NN')
    ) {
      slots.add('12NN');
    }
    if (token === '3PM' || token === '3:00PM' || token.startsWith('3PM')) {
      slots.add('3PM');
    }
  }

  return slots;
}

export function getMonthWeekRanges(year: number, monthIndex: number): WeekRange[] {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const startDayOfWeek = firstDay.getDay();
  const diffToMonday = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  const firstMonday = new Date(year, monthIndex, 1 - diffToMonday);

  const lastDayOfWeek = lastDay.getDay();
  const diffToSunday = lastDayOfWeek === 0 ? 0 : 7 - lastDayOfWeek;
  const lastSunday = new Date(
    lastDay.getFullYear(),
    lastDay.getMonth(),
    lastDay.getDate() + diffToSunday,
  );

  const weeks: WeekRange[] = [];
  let currMonday = new Date(firstMonday);
  let weekIndex = 1;

  while (currMonday <= lastSunday) {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      days.push(
        new Date(currMonday.getFullYear(), currMonday.getMonth(), currMonday.getDate() + i),
      );
    }
    weeks.push({
      weekNumber: weekIndex,
      startDate: new Date(currMonday),
      endDate: new Date(days[6]),
      days,
    });
    currMonday = new Date(
      currMonday.getFullYear(),
      currMonday.getMonth(),
      currMonday.getDate() + 7,
    );
    weekIndex++;
  }

  return weeks;
}

export function buildCalendarCells(year: number, monthIndex: number): CalendarCell[] {
  const cells: CalendarCell[] = [];
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  // Padding start
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push({
      dayNumber: null,
      monthDayKey: null,
      isCurrentMonth: false,
      isSunday: false,
      sundayKey: null,
    });
  }

  // Current month
  let sundayCount = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const isSunday = (startDayOfWeek + i - 1) % 7 === 0;
    let sundayKey: SundayKey | null = null;
    if (isSunday) {
      sundayKey = SUNDAY_KEYS[sundayCount];
      sundayCount++;
    }

    cells.push({
      dayNumber: i,
      monthDayKey: toMonthDayKey(monthIndex + 1, i),
      isoDate: toIsoDateKey(year, monthIndex + 1, i),
      isCurrentMonth: true,
      isSunday,
      sundayKey,
    });
  }

  // Padding end
  const remainingCells = 42 - cells.length;
  for (let i = 0; i < remainingCells; i++) {
    cells.push({
      dayNumber: null,
      monthDayKey: null,
      isCurrentMonth: false,
      isSunday: false,
      sundayKey: null,
    });
  }

  return cells;
}

export function buildMobileWeekCells(
  weekRange: WeekRange,
  viewYear: number,
  viewMonthIndex: number,
  scheduleMap: Map<string, MemberScheduleEntry[]>,
  milestoneMap: Map<string, MilestoneEntry[]>,
): WeekCell[] {
  return weekRange.days
    .filter((date) => date.getFullYear() === viewYear && date.getMonth() === viewMonthIndex)
    .map((date) => {
      const isSunday = date.getDay() === 0;
      const monthDayKey = toMonthDayKey(date.getMonth() + 1, date.getDate());

      let sundayKey: SundayKey | null = null;
      if (isSunday) {
        const sundayIndex = Math.floor((date.getDate() - 1) / 7);
        sundayKey = SUNDAY_KEYS[sundayIndex] ?? null;
      }

      const scheduleEntries = scheduleMap.get(monthDayKey) ?? [];
      const milestoneEntries = milestoneMap.get(monthDayKey) ?? [];

      return {
        date,
        monthDayKey,
        isoDate: toIsoDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate()),
        scheduleEntries,
        milestoneEntries,
        isSunday,
        sundayKey,
      };
    });
}

/**
 * Checks if a member is excused for a given date key.
 * Supports matching against both users.id (UUID) and users.member_id (e.g. "WC-001"),
 * with case-insensitive and whitespace-tolerant matching.
 *
 * If `serviceSlot` is provided, verifies if the member is excused for that specific slot.
 * If `serviceSlot` is omitted, returns true if the member is excused for ANY slot on that date (for calendar day views).
 */
export function isMemberExcused(
  excusedMap: ExcusedMemberMap | undefined,
  dateKey: string | null | undefined,
  member: { id?: string | null; member_id?: string | null },
  serviceSlot?: TimeSlot,
): boolean {
  if (!excusedMap || !dateKey) return false;
  const memberMap = excusedMap.get(dateKey);
  if (!memberMap) return false;

  let memberSlots: Set<TimeSlot> | undefined;
  if (member.id) {
    memberSlots = memberMap.get(member.id.toLowerCase());
  }
  if (!memberSlots && member.member_id) {
    memberSlots = memberMap.get(member.member_id.trim().toLowerCase());
  }

  if (!memberSlots || memberSlots.size === 0) return false;

  if (serviceSlot) {
    return memberSlots.has(serviceSlot);
  }

  return true;
}
