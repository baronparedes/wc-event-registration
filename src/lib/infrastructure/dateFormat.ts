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
