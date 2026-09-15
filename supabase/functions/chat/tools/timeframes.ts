import * as chrono from 'npm:chrono-node@2.8.0';

export type MilestoneTimeframe =
  | 'upcoming'
  | 'today'
  | 'this_week'
  | 'next_week'
  | 'last_week'
  | 'next_2_weeks'
  | 'last_2_weeks'
  | 'this_month'
  | 'next_month'
  | 'last_month';
export type SundayTimeframe = 'coming_sunday' | 'this_month' | 'next_month';

const timeframeAliases: Record<string, MilestoneTimeframe> = {
  upcoming: 'upcoming',
  'next 7 days': 'upcoming',
  'coming week': 'upcoming',
  today: 'today',
  now: 'today',
  'this week': 'this_week',
  'current week': 'this_week',
  'next week': 'next_week',
  'week after next': 'next_week',
  'last week': 'last_week',
  'previous week': 'last_week',
  'next 2 weeks': 'next_2_weeks',
  'coming 2 weeks': 'next_2_weeks',
  'last 2 weeks': 'last_2_weeks',
  'past 2 weeks': 'last_2_weeks',
  'previous 2 weeks': 'last_2_weeks',
  'next two weeks': 'next_2_weeks',
  'coming two weeks': 'next_2_weeks',
  'last two weeks': 'last_2_weeks',
  'past two weeks': 'last_2_weeks',
  'previous two weeks': 'last_2_weeks',
  'this month': 'this_month',
  'current month': 'this_month',
  'next month': 'next_month',
  'last month': 'last_month',
  'previous month': 'last_month',
};

export function normalizeMilestoneTimeframe(
  input: string,
  now = new Date(),
): MilestoneTimeframe | null {
  const normalized = input.trim().toLowerCase().replace(/\s+/g, ' ');
  const directMatch = timeframeAliases[normalized];
  if (directMatch) return directMatch;

  const parsed = chrono.parseDate(normalized, now, { forwardDate: true });
  if (!parsed) return null;

  const dayStart = new Date(now);
  dayStart.setHours(12, 0, 0, 0);
  const parsedStart = new Date(parsed);
  parsedStart.setHours(12, 0, 0, 0);
  const dayDifference = Math.round(
    (parsedStart.getTime() - dayStart.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (dayDifference === 0) return 'today';
  if (dayDifference > 0 && dayDifference <= 7) return 'upcoming';
  if (dayDifference < 0 && dayDifference >= -7) return 'last_week';

  const monthDifference =
    (parsedStart.getFullYear() - now.getFullYear()) * 12 + parsedStart.getMonth() - now.getMonth();
  if (monthDifference === 0) return 'this_month';
  if (monthDifference === 1) return 'next_month';
  if (monthDifference === -1) return 'last_month';

  return null;
}

function getDateRangeForTimeframe(timeframe: MilestoneTimeframe, now: Date): Date[] {
  const start = new Date(now);
  start.setHours(12, 0, 0, 0);

  if (timeframe === 'this_month' || timeframe === 'next_month' || timeframe === 'last_month') {
    const monthOffset = timeframe === 'next_month' ? 1 : timeframe === 'last_month' ? -1 : 0;
    const firstDay = new Date(start.getFullYear(), start.getMonth() + monthOffset, 1, 12);
    const daysInMonth = new Date(firstDay.getFullYear(), firstDay.getMonth() + 1, 0).getDate();
    return Array.from(
      { length: daysInMonth },
      (_, index) => new Date(firstDay.getFullYear(), firstDay.getMonth(), index + 1, 12),
    );
  }

  const ranges: Record<MilestoneTimeframe, [number, number]> = {
    upcoming: [0, 7],
    today: [0, 0],
    this_week: [0, 7],
    next_week: [8, 14],
    last_week: [-7, -1],
    next_2_weeks: [0, 14],
    last_2_weeks: [-14, -1],
    this_month: [0, 0],
    next_month: [0, 0],
    last_month: [0, 0],
  };
  const [startOffset, endOffset] = ranges[timeframe];

  return Array.from({ length: endOffset - startOffset + 1 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + startOffset + index);
    return date;
  });
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function describeMilestoneTimeframe(
  requestedTimeframe: string,
  timeframe: MilestoneTimeframe,
  now = new Date(),
): {
  requested: string;
  start_date: string;
  end_date: string;
} {
  const dates = getDateRangeForTimeframe(timeframe, now);

  return {
    requested: requestedTimeframe,
    start_date: formatDate(dates[0]),
    end_date: formatDate(dates[dates.length - 1]),
  };
}

export function getMonthDayKeysForTimeframe(
  timeframe: MilestoneTimeframe,
  now = new Date(),
): Set<string> {
  return new Set(
    getDateRangeForTimeframe(timeframe, now).map(
      (date) => `${date.getMonth() + 1}-${date.getDate()}`,
    ),
  );
}

export function isMonthDayInTimeframe(
  month: number,
  day: number,
  timeframe: MilestoneTimeframe,
  now = new Date(),
): boolean {
  return getMonthDayKeysForTimeframe(timeframe, now).has(`${month}-${day}`);
}

function sundayKeyForDate(date: Date): string {
  const occurrence = Math.ceil(date.getDate() / 7);
  return `${['first', 'second', 'third', 'fourth', 'fifth'][occurrence - 1]}_sunday`;
}

export function getSundaysForTimeframe(
  timeframe: SundayTimeframe,
  now = new Date(),
): { date: Date; key: string }[] {
  if (timeframe === 'coming_sunday') {
    const comingSunday = new Date(now);
    comingSunday.setDate(comingSunday.getDate() + ((7 - comingSunday.getDay()) % 7));
    return [{ date: comingSunday, key: sundayKeyForDate(comingSunday) }];
  }

  const monthOffset = timeframe === 'next_month' ? 1 : 0;
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const sundays: { date: Date; key: string }[] = [];
  const daysInMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0).getDate();

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), day);
    if (date.getDay() === 0) sundays.push({ date, key: sundayKeyForDate(date) });
  }

  return sundays;
}
