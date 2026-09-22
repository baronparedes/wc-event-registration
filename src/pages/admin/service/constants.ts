import { format, getDay, subDays } from 'date-fns';

export const MIN_YEAR = 2025;

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const TIME_SLOTS = ['9AM', '12NN', '3PM'] as const;
export type ServiceTimeSlot = (typeof TIME_SLOTS)[number];

export const SERVICE_ROLES = [
  'Backroom Support',
  'IMT Support',
  'OIC',
  'Prayer Coach',
  'Usher',
  'VMT Support',
] as const;
export type ServiceRole = (typeof SERVICE_ROLES)[number];

export type FilterMode = 'sunday' | 'month' | 'annual';

/** Returns the date string (YYYY-MM-DD) of the nearest previous Sunday (or today if Sunday) */
export function getNearestPreviousSunday(date: Date = new Date()): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = getDay(d);
  return format(subDays(d, day), 'yyyy-MM-dd');
}

/** Returns the date string (YYYY-MM-DD) of the last Sunday of a given year */
export function getLastSundayOfYear(year: number): string {
  const d = new Date(year, 11, 31);
  d.setHours(0, 0, 0, 0);
  const day = getDay(d);
  return format(subDays(d, day), 'yyyy-MM-dd');
}
