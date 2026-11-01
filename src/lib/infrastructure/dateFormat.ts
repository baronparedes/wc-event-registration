/**
 * Format an ISO date string to a localized date-only string in Asia/Manila timezone (UTC+8).
 * Used for displaying event dates and registration windows.
 *
 * @param isoString - ISO date string or null
 * @param fallback - String to return if isoString is null/invalid (default: '—')
 * @returns Formatted date string (e.g., "Jun 23, 2026")
 */
export function formatDateOnly(isoString: string | null, fallback = '—'): string {
  if (!isoString) return fallback;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Manila',
  });
}

export function formatDayMonth(isoString: string | null, fallback = '—'): string {
  if (!isoString) return fallback;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    timeZone: 'Asia/Manila',
  });
}

/**
 * Format an ISO datetime string to a localized datetime string in Asia/Manila timezone (UTC+8).
 * Used for displaying full datetime with time component.
 *
 * @param isoString - ISO datetime string or null
 * @param fallback - String to return if isoString is null/invalid (default: 'TBD')
 * @returns Formatted datetime string (e.g., "Jun 23, 2026, 2:30 PM")
 */
export function formatDateTime(isoString: string | null, fallback = 'TBD'): string {
  if (!isoString) return fallback;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleString(undefined, { timeZone: 'Asia/Manila' });
}

/**
 * Format an ISO datetime string to a localized time-only string in Asia/Manila timezone (UTC+8).
 * Used for displaying service attendance check-in times.
 *
 * @param isoString - ISO datetime string or null
 * @param fallback - String to return if isoString is null/invalid (default: '—')
 * @returns Formatted time string (e.g., "8:45 AM")
 */
export function formatTimeOnly(isoString: string | null, fallback = '—'): string {
  if (!isoString) return fallback;
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila',
  });
}

/**
 * Convert a datetime-local input value (assumed to be in UTC+8 Philippines time)
 * to an ISO string with UTC+8 offset (+08:00).
 * Used when saving form inputs from the UI to the database.
 *
 * @param localDateTimeValue - Value from datetime-local input (e.g., "2026-08-15T21:00:00")
 * @returns ISO string with UTC+8 offset (e.g., "2026-08-15T21:00:00+08:00"), or null if invalid
 */
export function localDateTimeToUTC8ISO(localDateTimeValue: string | undefined): string | null {
  if (!localDateTimeValue) return null;
  // datetime-local gives us "YYYY-MM-DDTHH:mm:ss"
  // We treat it as UTC+8 and append the offset
  const trimmed = localDateTimeValue.trim();
  if (!trimmed) return null;
  return `${trimmed}+08:00`;
}

/**
 * Converts an ISO timestamp or date-time string to the datetime-local input format (YYYY-MM-DDTHH:mm) in Asia/Manila (UTC+8).
 * If the string lacks an explicit timezone offset, it is assumed to already be in Asia/Manila time.
 *
 * @param value - ISO datetime string, datetime-local string, or null/undefined
 * @returns datetime-local format string (e.g., "2026-11-21T09:00"), or empty string if invalid
 */
export function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';

  const hasTimezone = /([+-]\d{2}:?\d{2}|Z)$/i.test(trimmed);
  const normalized = hasTimezone ? trimmed : `${trimmed.replace(' ', 'T')}+08:00`;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return '';

  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(parsed);

  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;

  if (!year || !month || !day || !hour || !minute) {
    return '';
  }

  return `${year}-${month}-${day}T${hour}:${minute}`;
}
