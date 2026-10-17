export interface UpcomingSundayOption {
  value: string;
  label: string;
  formattedDate: string;
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
