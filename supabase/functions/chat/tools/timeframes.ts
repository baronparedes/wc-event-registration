/**
 * Timeframe utilities for chat tools.
 *
 * Tools accept optional `targetStartDate` and `targetEndDate` (ISO YYYY-MM-DD).
 * The LLM resolves natural-language timeframe phrases into concrete dates before
 * calling any tool. These helpers operate purely on resolved Date objects so that
 * no individual tool needs to understand natural language.
 */

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/** Parse an optional ISO date string (YYYY-MM-DD or full ISO) into a Date at noon local time. */
export function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  // Accept YYYY-MM-DD or full ISO strings
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a Date as YYYY-MM-DD. */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ---------------------------------------------------------------------------
// Date-range resolution
// ---------------------------------------------------------------------------

export const PHILIPPINES_TIMEZONE = 'Asia/Manila';

/**
 * Returns a Date representing the current instant in Philippine Standard Time (Asia/Manila, UTC+8).
 * Its local methods (.getFullYear(), .getMonth(), .getDate(), .getDay(), .getHours())
 * reflect the current date and time in the Philippines.
 */
export function getPhNow(base = new Date()): Date {
  const phString = base.toLocaleString('en-US', { timeZone: PHILIPPINES_TIMEZONE });
  return new Date(phString);
}

export type DateRange = { start: Date; end: Date };

type FallbackStrategy = 'this_month' | 'coming_sunday' | 'previous_sunday' | 'none'; // no filter — return null

/**
 * Resolve optional ISO date strings into a concrete DateRange.
 * When both are omitted the `fallback` strategy is applied.
 * Returns `null` only when `fallback === 'none'` and both dates are absent.
 */
export function resolveDateRange(
  targetStartDate: string | null | undefined,
  targetEndDate: string | null | undefined,
  fallback: FallbackStrategy,
  now = getPhNow(),
): DateRange | null {
  const start = parseIsoDate(targetStartDate);
  const end = parseIsoDate(targetEndDate);

  if (start && end) return { start, end };

  // One-sided: pad the missing boundary
  if (start && !end) return { start, end: start };
  if (!start && end) return { start: end, end };

  // Both absent — apply fallback
  if (fallback === 'this_month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 12);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 12);
    return { start: monthStart, end: monthEnd };
  }

  if (fallback === 'coming_sunday') {
    const today = new Date(now);
    today.setHours(12, 0, 0, 0);
    const daysUntilSunday = (7 - today.getDay()) % 7;
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + daysUntilSunday);
    return { start: sunday, end: sunday };
  }

  if (fallback === 'previous_sunday') {
    const today = new Date(now);
    today.setHours(12, 0, 0, 0);
    const day = today.getDay(); // 0 is Sunday
    const sunday = new Date(today);
    if (day !== 0) {
      sunday.setDate(today.getDate() - day);
    }
    return { start: sunday, end: sunday };
  }

  return null;
}

/**
 * Build a human-readable description of the resolved date range to include
 * in tool responses (so the LLM can relay it back to the user).
 */
export function describeDateRange(range: DateRange): {
  start_date: string;
  end_date: string;
} {
  return {
    start_date: formatDate(range.start),
    end_date: formatDate(range.end),
  };
}

// ---------------------------------------------------------------------------
// Sunday utilities
// ---------------------------------------------------------------------------

function sundayKeyForDate(date: Date): string {
  const occurrence = Math.ceil(date.getDate() / 7);
  return `${['first', 'second', 'third', 'fourth', 'fifth'][occurrence - 1]}_sunday`;
}

/**
 * Return all Sundays (with their metadata key) that fall within [range.start, range.end].
 * When the range spans only a single day that IS a Sunday, that Sunday is returned.
 * When it spans a single day that is NOT a Sunday (e.g. coming-Sunday fallback
 * returned the exact next Sunday), we still include only the Sundays within range.
 */
export function getSundaysInRange(range: DateRange): { date: Date; key: string }[] {
  const sundays: { date: Date; key: string }[] = [];

  const cursor = new Date(range.start);
  cursor.setHours(12, 0, 0, 0);

  // Advance to the first Sunday on or after range.start
  const daysUntilSunday = (7 - cursor.getDay()) % 7;
  cursor.setDate(cursor.getDate() + daysUntilSunday);

  const rangeEnd = new Date(range.end);
  rangeEnd.setHours(23, 59, 59, 999);

  while (cursor <= rangeEnd) {
    sundays.push({ date: new Date(cursor), key: sundayKeyForDate(cursor) });
    cursor.setDate(cursor.getDate() + 7);
  }

  return sundays;
}

// ---------------------------------------------------------------------------
// Month-day matching (for milestone tools — birthday / anniversary)
// ---------------------------------------------------------------------------

/**
 * Build a Set of "M-D" strings for every calendar day within [range.start, range.end].
 * Month-day strings are year-agnostic so they work for birthdays / anniversaries.
 */
export function getMonthDayKeysForRange(range: DateRange): Set<string> {
  const keys = new Set<string>();
  const cursor = new Date(range.start);
  cursor.setHours(12, 0, 0, 0);
  const end = new Date(range.end);
  end.setHours(12, 0, 0, 0);

  while (cursor <= end) {
    keys.add(`${cursor.getMonth() + 1}-${cursor.getDate()}`);
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function isMonthDayInRange(month: number, day: number, range: DateRange): boolean {
  return getMonthDayKeysForRange(range).has(`${month}-${day}`);
}
