import type { AttendanceAnswerSummary, RegistrationAnswerSummary } from '@/lib/domain/attendance';

const EMPTY_VALUE = '';

const WEEKDAY_BY_TOKEN: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const MONTH_BY_TOKEN: Record<string, number> = {
  JANUARY: 0,
  FEBRUARY: 1,
  MARCH: 2,
  APRIL: 3,
  MAY: 4,
  JUNE: 5,
  JULY: 6,
  AUGUST: 7,
  SEPTEMBER: 8,
  OCTOBER: 9,
  NOVEMBER: 10,
  DECEMBER: 11,
};

type RelativeDateLiteral =
  | {
      kind: 'upcomingWeekday';
      weekday: number;
    }
  | {
      kind: 'month';
      month: number;
    }
  | {
      kind: 'yearMonth';
      year: number;
      month: number;
    }
  | {
      kind: 'year';
      year: number;
    }
  | {
      kind: 'previousWeeks';
      weeks: number;
    };

export function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function parseRelativeDateLiteral(rawValue: string): RelativeDateLiteral | null {
  const normalized = rawValue.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('UPCOMING_')) {
    const token = normalized.slice('UPCOMING_'.length);
    const weekday = WEEKDAY_BY_TOKEN[token];
    if (weekday !== undefined) {
      return {
        kind: 'upcomingWeekday',
        weekday,
      };
    }
  }

  if (normalized.startsWith('MONTH_')) {
    const token = normalized.slice('MONTH_'.length);
    const month = MONTH_BY_TOKEN[token];
    if (month !== undefined) {
      return {
        kind: 'month',
        month,
      };
    }
  }

  const yearMonthMatch = normalized.match(/^YEAR_MONTH_(\d{4})_([A-Z]+)$/);
  if (yearMonthMatch) {
    const month = MONTH_BY_TOKEN[yearMonthMatch[2]];
    if (month !== undefined) {
      return {
        kind: 'yearMonth',
        year: Number(yearMonthMatch[1]),
        month,
      };
    }
  }

  const yearMatch = normalized.match(/^YEAR_(\d{4})$/);
  if (yearMatch) {
    return {
      kind: 'year',
      year: Number(yearMatch[1]),
    };
  }

  const previousWeeksMatch = normalized.match(/^PREVIOUS_(\d+)_WEEKS$/);
  if (previousWeeksMatch) {
    const weeks = Number(previousWeeksMatch[1]);
    if (Number.isInteger(weeks) && weeks > 0) {
      return {
        kind: 'previousWeeks',
        weeks,
      };
    }
  }

  return null;
}

export function parseDateValue(rawValue: string): Date | null {
  const timestamp = Date.parse(rawValue);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

export function matchesRelativeDateLiteral(
  fieldValue: string,
  filterValue: string,
  now: Date = new Date(),
): boolean | null {
  const literal = parseRelativeDateLiteral(filterValue);
  if (!literal) {
    return null;
  }

  const fieldDate = parseDateValue(fieldValue);
  if (!fieldDate) {
    return false;
  }

  const fieldDay = startOfUtcDay(fieldDate);
  const nowDay = startOfUtcDay(now);

  if (literal.kind === 'upcomingWeekday') {
    const daysUntil = (literal.weekday - nowDay.getUTCDay() + 7) % 7;
    const targetDay = addUtcDays(nowDay, daysUntil);
    return fieldDay.getTime() === targetDay.getTime();
  }

  if (literal.kind === 'month') {
    return fieldDate.getUTCMonth() === literal.month;
  }

  if (literal.kind === 'year') {
    return fieldDate.getUTCFullYear() === literal.year;
  }

  if (literal.kind === 'yearMonth') {
    return fieldDate.getUTCFullYear() === literal.year && fieldDate.getUTCMonth() === literal.month;
  }

  const rangeStart = addUtcDays(nowDay, -literal.weeks * 7);
  return fieldDay.getTime() >= rangeStart.getTime() && fieldDay.getTime() <= nowDay.getTime();
}

export function answerValue(answer: RegistrationAnswerSummary | AttendanceAnswerSummary): string {
  if (answer.answer_text !== null) return answer.answer_text.trim();
  if (answer.answer_number !== null) return String(answer.answer_number);
  return EMPTY_VALUE;
}

export function parseMultiSelectValues(
  answer: RegistrationAnswerSummary | AttendanceAnswerSummary,
): string[] {
  if (answer.field_type !== 'multi_select' || answer.answer_text === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(answer.answer_text);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const seen = new Set<string>();
    const values: string[] = [];

    for (const entry of parsed) {
      if (typeof entry !== 'string') {
        continue;
      }

      const normalizedEntry = entry.trim();
      if (!normalizedEntry) {
        continue;
      }

      const dedupeToken = normalizeValue(normalizedEntry);
      if (seen.has(dedupeToken)) {
        continue;
      }

      seen.add(dedupeToken);
      values.push(normalizedEntry);
    }

    return values.sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function parseMultiSelectToggleTrueKeys(
  answer: RegistrationAnswerSummary | AttendanceAnswerSummary,
): string[] {
  if (answer.field_type !== 'multi_select_toggle' || answer.answer_text === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(answer.answer_text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return [];
    }

    const values = Object.entries(parsed as Record<string, unknown>)
      .filter(([, value]) => value === true)
      .map(([key]) => key.trim())
      .filter((key) => key.length > 0);

    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const value of values) {
      const token = normalizeValue(value);
      if (seen.has(token)) {
        continue;
      }

      seen.add(token);
      deduped.push(value);
    }

    return deduped.sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function parseMultiSelectToggleKeys(
  answer: RegistrationAnswerSummary | AttendanceAnswerSummary,
): string[] {
  if (answer.field_type !== 'multi_select_toggle' || answer.answer_text === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(answer.answer_text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return [];
    }

    const values = Object.keys(parsed as Record<string, unknown>)
      .map((key) => key.trim())
      .filter((key) => key.length > 0);

    const seen = new Set<string>();
    const deduped: string[] = [];

    for (const value of values) {
      const token = normalizeValue(value);
      if (seen.has(token)) {
        continue;
      }

      seen.add(token);
      deduped.push(value);
    }

    return deduped.sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}

export function parseMultiSelectToggleMap(
  answer: RegistrationAnswerSummary | AttendanceAnswerSummary,
): Record<string, boolean> {
  if (answer.field_type !== 'multi_select_toggle' || answer.answer_text === null) {
    return {};
  }

  try {
    const parsed = JSON.parse(answer.answer_text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    const result: Record<string, boolean> = {};
    for (const [rawKey, rawValue] of Object.entries(parsed as Record<string, unknown>)) {
      const key = rawKey.trim();
      if (!key) {
        continue;
      }

      if (typeof rawValue !== 'boolean') {
        continue;
      }

      result[key] = rawValue;
    }

    return result;
  } catch {
    return {};
  }
}

export function parseMultiSelectToggleFilterValue(rawFilterValue: string): {
  key: string;
  expectedBoolean: boolean | null;
} | null {
  const trimmed = rawFilterValue.trim();
  if (!trimmed) {
    return null;
  }

  const equalsIndex = trimmed.indexOf('=');
  if (equalsIndex === -1) {
    return {
      key: trimmed,
      expectedBoolean: null,
    };
  }

  const key = trimmed.slice(0, equalsIndex).trim();
  const rawBoolean = trimmed
    .slice(equalsIndex + 1)
    .trim()
    .toLowerCase();
  if (!key) {
    return null;
  }

  if (rawBoolean === 'true') {
    return { key, expectedBoolean: true };
  }

  if (rawBoolean === 'false') {
    return { key, expectedBoolean: false };
  }

  return {
    key: trimmed,
    expectedBoolean: null,
  };
}

export function parseTimeLabelToMinutes(rawSegment: string): number | null {
  const segment = rawSegment.trim().toUpperCase();
  if (!segment) {
    return null;
  }

  const match = segment.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|NN|MN)$/);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  const meridiem = match[3];

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 1 || hours > 12) {
    return null;
  }

  if (minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem === 'MN') {
    return minutes;
  }

  if (meridiem === 'NN') {
    return 12 * 60 + minutes;
  }

  let normalizedHours = hours % 12;
  if (meridiem === 'PM') {
    normalizedHours += 12;
  }

  return normalizedHours * 60 + minutes;
}

export function parseChronologicalLabel(rawSegment: string): number | null {
  const segment = rawSegment.trim();
  if (!segment) {
    return null;
  }

  const parsedTimestamp = Date.parse(segment);
  if (!Number.isNaN(parsedTimestamp)) {
    return parsedTimestamp;
  }

  const minutes = parseTimeLabelToMinutes(segment);
  if (minutes === null) {
    return null;
  }

  // Use a synthetic epoch-based timestamp for time-only labels.
  return minutes * 60 * 1000;
}
