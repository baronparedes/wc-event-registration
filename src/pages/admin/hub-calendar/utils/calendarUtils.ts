export type WeekRange = {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  days: Date[];
};

export const SUNDAY_KEYS: import('@/hooks/domain/members').SundayKey[] = [
  'first_sunday',
  'second_sunday',
  'third_sunday',
  'fourth_sunday',
  'fifth_sunday',
];

export function toMonthDayKey(month: number, day: number): string {
  return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
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

export function buildCalendarCells(
  year: number,
  monthIndex: number,
): import('../types').CalendarCell[] {
  const cells: import('../types').CalendarCell[] = [];
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
    let sundayKey: import('@/hooks/domain/members').SundayKey | null = null;
    if (isSunday) {
      sundayKey = SUNDAY_KEYS[sundayCount];
      sundayCount++;
    }

    cells.push({
      dayNumber: i,
      monthDayKey: toMonthDayKey(monthIndex + 1, i),
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
  scheduleMap: Map<string, import('@/hooks/domain/members').MemberScheduleEntry[]>,
  milestoneMap: Map<string, import('../types').MilestoneEntry[]>,
): import('../types').WeekCell[] {
  return weekRange.days
    .filter((date) => date.getFullYear() === viewYear && date.getMonth() === viewMonthIndex)
    .map((date) => {
      const isSunday = date.getDay() === 0;
      const monthDayKey = toMonthDayKey(date.getMonth() + 1, date.getDate());

      let sundayKey: import('@/hooks/domain/members').SundayKey | null = null;
      if (isSunday) {
        const sundayIndex = Math.floor((date.getDate() - 1) / 7);
        sundayKey = SUNDAY_KEYS[sundayIndex] ?? null;
      }

      const scheduleEntries = scheduleMap.get(monthDayKey) ?? [];
      const milestoneEntries = milestoneMap.get(monthDayKey) ?? [];

      return {
        date,
        monthDayKey,
        scheduleEntries,
        milestoneEntries,
        isSunday,
        sundayKey,
      };
    });
}
