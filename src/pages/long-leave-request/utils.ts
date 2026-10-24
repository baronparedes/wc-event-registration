export interface UpcomingSundayOption {
  value: string;
  label: string;
  formattedDate: string;
}

export function parseDateOnly(value: string | undefined): Date | undefined {
  if (!value || value.length < 10) {
    return undefined;
  }

  const [yearString, monthString, dayString] = value.slice(0, 10).split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);

  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined;
  }

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined;
  }

  return date;
}

export function formatDateOnly(value: Date): string {
  const year = String(value.getFullYear());
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatSundayDisplay(dateString: string | undefined): string {
  const parsed = parseDateOnly(dateString);
  if (!parsed) return 'Select Sunday date';
  return parsed.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Returns nearest upcoming Sunday in YYYY-MM-DD format
 */
export function getNearestUpcomingSundayString(): string {
  const now = new Date();
  const day = now.getDay();
  const daysUntilSunday = (7 - day) % 7;
  const currentSunday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + (daysUntilSunday === 0 ? 0 : daysUntilSunday),
  );
  return formatDateOnly(currentSunday);
}

/**
 * Returns a list of upcoming Sundays starting from the nearest upcoming Sunday.
 */
export function getUpcomingSundays(count = 6): UpcomingSundayOption[] {
  const sundays: UpcomingSundayOption[] = [];
  const now = new Date();
  const day = now.getDay();
  // 0 is Sunday. If today is Sunday, it is today (0 days away), else (7 - day) days away.
  const daysUntilSunday = (7 - day) % 7;
  const currentSunday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilSunday,
  );

  for (let i = 0; i < count; i++) {
    const d = new Date(
      currentSunday.getFullYear(),
      currentSunday.getMonth(),
      currentSunday.getDate() + i * 7,
    );
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    const value = `${year}-${month}-${date}`;
    const formattedDate = d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    sundays.push({
      value,
      formattedDate,
      label: i === 0 ? `${formattedDate} (Upcoming Sunday)` : formattedDate,
    });
  }

  return sundays;
}

export const EXCUSE_SERVICE_SLOTS = [
  { value: '9AM', label: '9:00 AM' },
  { value: '12NN', label: '12:00 NN' },
  { value: '3PM', label: '3:00 PM' },
] as const;

export function formatServiceSlots(slots: string[]): string {
  const map: Record<string, string> = {
    '9AM': '9:00 AM',
    '12NN': '12:00 NN',
    '3PM': '3:00 PM',
  };
  return slots.map((s) => map[s] || s).join(', ');
}
