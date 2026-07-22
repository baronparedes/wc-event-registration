import { describe, expect, it } from 'vitest';

import type { AttendanceAnswerSummary, RegistrationAnswerSummary } from '@/lib/domain/attendance';

import {
  addUtcDays,
  answerValue,
  matchesRelativeDateLiteral,
  normalizeValue,
  parseChronologicalLabel,
  parseDateValue,
  parseMultiSelectToggleFilterValue,
  parseMultiSelectToggleKeys,
  parseMultiSelectToggleMap,
  parseMultiSelectToggleTrueKeys,
  parseMultiSelectValues,
  parseRelativeDateLiteral,
  parseTimeLabelToMinutes,
  startOfUtcDay,
} from '../transforms/parsing';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRegAnswer(overrides: Partial<RegistrationAnswerSummary>): RegistrationAnswerSummary {
  return {
    event_field_id: 'field-1',
    field_type: 'text',
    field_key: 'key',
    label: 'Label',
    answer_text: null,
    answer_number: null,
    ...overrides,
  };
}

function makeAttAnswer(overrides: Partial<AttendanceAnswerSummary>): AttendanceAnswerSummary {
  return {
    attendance_field_id: 'field-1',
    field_type: 'text',
    field_key: 'key',
    label: 'Label',
    answer_text: null,
    answer_number: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// normalizeValue
// ---------------------------------------------------------------------------

describe('normalizeValue', () => {
  it('lowercases and trims the value', () => {
    expect(normalizeValue('  Hello World  ')).toBe('hello world');
    expect(normalizeValue('SUNDAY')).toBe('sunday');
    expect(normalizeValue('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// startOfUtcDay
// ---------------------------------------------------------------------------

describe('startOfUtcDay', () => {
  it('returns midnight UTC for a given date', () => {
    const d = new Date('2026-07-15T14:32:00.000Z');
    const result = startOfUtcDay(d);

    expect(result.toISOString()).toBe('2026-07-15T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// addUtcDays
// ---------------------------------------------------------------------------

describe('addUtcDays', () => {
  it('adds positive days to a UTC date', () => {
    const d = new Date('2026-07-15T00:00:00.000Z');
    expect(addUtcDays(d, 3).toISOString()).toBe('2026-07-18T00:00:00.000Z');
  });

  it('subtracts days when negative offset is given', () => {
    const d = new Date('2026-07-15T00:00:00.000Z');
    expect(addUtcDays(d, -5).toISOString()).toBe('2026-07-10T00:00:00.000Z');
  });

  it('does not mutate the original date', () => {
    const d = new Date('2026-07-15T00:00:00.000Z');
    addUtcDays(d, 1);
    expect(d.toISOString()).toBe('2026-07-15T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// parseRelativeDateLiteral
// ---------------------------------------------------------------------------

describe('parseRelativeDateLiteral', () => {
  it('parses UPCOMING_<WEEKDAY> literals', () => {
    expect(parseRelativeDateLiteral('UPCOMING_SUNDAY')).toEqual({
      kind: 'upcomingWeekday',
      weekday: 0,
    });
    expect(parseRelativeDateLiteral('UPCOMING_FRIDAY')).toEqual({
      kind: 'upcomingWeekday',
      weekday: 5,
    });
  });

  it('parses MONTH_<MONTH> literals', () => {
    expect(parseRelativeDateLiteral('MONTH_JANUARY')).toEqual({ kind: 'month', month: 0 });
    expect(parseRelativeDateLiteral('MONTH_DECEMBER')).toEqual({ kind: 'month', month: 11 });
  });

  it('parses YEAR_MONTH_<YEAR>_<MONTH> literals', () => {
    expect(parseRelativeDateLiteral('YEAR_MONTH_2026_JULY')).toEqual({
      kind: 'yearMonth',
      year: 2026,
      month: 6,
    });
  });

  it('parses YEAR_<YEAR> literals', () => {
    expect(parseRelativeDateLiteral('YEAR_2025')).toEqual({ kind: 'year', year: 2025 });
  });

  it('parses PREVIOUS_<N>_WEEKS literals', () => {
    expect(parseRelativeDateLiteral('PREVIOUS_4_WEEKS')).toEqual({
      kind: 'previousWeeks',
      weeks: 4,
    });
  });

  it('is case-insensitive for the literal tokens', () => {
    expect(parseRelativeDateLiteral('upcoming_sunday')).toEqual({
      kind: 'upcomingWeekday',
      weekday: 0,
    });
  });

  it('returns null for unknown or empty values', () => {
    expect(parseRelativeDateLiteral('')).toBeNull();
    expect(parseRelativeDateLiteral('RANDOM_VALUE')).toBeNull();
    expect(parseRelativeDateLiteral('UPCOMING_NOTADAY')).toBeNull();
    expect(parseRelativeDateLiteral('MONTH_NOTAMONTH')).toBeNull();
    expect(parseRelativeDateLiteral('YEAR_MONTH_2026_NOTAMONTH')).toBeNull();
    expect(parseRelativeDateLiteral('PREVIOUS_0_WEEKS')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseDateValue
// ---------------------------------------------------------------------------

describe('parseDateValue', () => {
  it('parses a valid ISO date string', () => {
    const result = parseDateValue('2026-07-15');
    expect(result).toBeInstanceOf(Date);
    expect(Number.isNaN(result?.getTime())).toBe(false);
  });

  it('returns null for invalid date strings', () => {
    expect(parseDateValue('not-a-date')).toBeNull();
    expect(parseDateValue('')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// matchesRelativeDateLiteral
// ---------------------------------------------------------------------------

describe('matchesRelativeDateLiteral', () => {
  it('returns null when filter value is not a relative literal', () => {
    expect(matchesRelativeDateLiteral('2026-07-15', 'not-a-literal')).toBeNull();
  });

  it('returns false when fieldValue is not a valid date', () => {
    expect(matchesRelativeDateLiteral('invalid-date', 'UPCOMING_SUNDAY')).toBe(false);
  });

  it('matches upcomingWeekday when fieldDate is the next occurrence of that weekday', () => {
    // Tuesday 2026-07-21 — upcoming Sunday is 2026-07-26
    const now = new Date('2026-07-21T10:00:00.000Z');
    expect(matchesRelativeDateLiteral('2026-07-26', 'UPCOMING_SUNDAY', now)).toBe(true);
    expect(matchesRelativeDateLiteral('2026-07-25', 'UPCOMING_SUNDAY', now)).toBe(false);
  });

  it('matches month literal when fieldDate is in that month', () => {
    const now = new Date('2026-07-21T00:00:00.000Z');
    expect(matchesRelativeDateLiteral('2026-07-10', 'MONTH_JULY', now)).toBe(true);
    expect(matchesRelativeDateLiteral('2026-06-10', 'MONTH_JULY', now)).toBe(false);
  });

  it('matches year literal when fieldDate is in that year', () => {
    const now = new Date('2026-07-21T00:00:00.000Z');
    expect(matchesRelativeDateLiteral('2026-03-01', 'YEAR_2026', now)).toBe(true);
    expect(matchesRelativeDateLiteral('2025-03-01', 'YEAR_2026', now)).toBe(false);
  });

  it('matches yearMonth literal when fieldDate year and month match', () => {
    const now = new Date('2026-07-21T00:00:00.000Z');
    expect(matchesRelativeDateLiteral('2026-07-05', 'YEAR_MONTH_2026_JULY', now)).toBe(true);
    expect(matchesRelativeDateLiteral('2026-06-05', 'YEAR_MONTH_2026_JULY', now)).toBe(false);
  });

  it('matches previousWeeks when fieldDate is within N weeks before today', () => {
    const now = new Date('2026-07-21T00:00:00.000Z');
    // 2 weeks back from 2026-07-21 = 2026-07-07
    expect(matchesRelativeDateLiteral('2026-07-10', 'PREVIOUS_2_WEEKS', now)).toBe(true);
    expect(matchesRelativeDateLiteral('2026-07-21', 'PREVIOUS_2_WEEKS', now)).toBe(true);
    expect(matchesRelativeDateLiteral('2026-07-06', 'PREVIOUS_2_WEEKS', now)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// answerValue
// ---------------------------------------------------------------------------

describe('answerValue', () => {
  it('returns trimmed answer_text when present', () => {
    expect(answerValue(makeRegAnswer({ answer_text: '  hello  ' }))).toBe('hello');
  });

  it('returns stringified answer_number when answer_text is null', () => {
    expect(answerValue(makeRegAnswer({ answer_text: null, answer_number: 42 }))).toBe('42');
  });

  it('returns empty string when both answer_text and answer_number are null', () => {
    expect(answerValue(makeRegAnswer({ answer_text: null, answer_number: null }))).toBe('');
  });
});

// ---------------------------------------------------------------------------
// parseMultiSelectValues
// ---------------------------------------------------------------------------

describe('parseMultiSelectValues', () => {
  it('returns sorted, deduplicated values from a multi_select JSON array', () => {
    const answer = makeRegAnswer({
      field_type: 'multi_select',
      answer_text: JSON.stringify(['Banana', 'Apple', 'banana']),
    });

    expect(parseMultiSelectValues(answer)).toEqual(['Apple', 'Banana']);
  });

  it('returns empty array for wrong field type', () => {
    expect(
      parseMultiSelectValues(makeRegAnswer({ field_type: 'text', answer_text: '["a"]' })),
    ).toEqual([]);
  });

  it('returns empty array when answer_text is null', () => {
    expect(
      parseMultiSelectValues(makeRegAnswer({ field_type: 'multi_select', answer_text: null })),
    ).toEqual([]);
  });

  it('returns empty array when answer_text is not a JSON array', () => {
    expect(
      parseMultiSelectValues(makeRegAnswer({ field_type: 'multi_select', answer_text: '{}' })),
    ).toEqual([]);
    expect(
      parseMultiSelectValues(
        makeRegAnswer({ field_type: 'multi_select', answer_text: 'malformed' }),
      ),
    ).toEqual([]);
  });

  it('skips non-string and blank entries', () => {
    const answer = makeRegAnswer({
      field_type: 'multi_select',
      answer_text: JSON.stringify([42, '', '  ', 'Valid']),
    });

    expect(parseMultiSelectValues(answer)).toEqual(['Valid']);
  });
});

// ---------------------------------------------------------------------------
// parseMultiSelectToggleTrueKeys
// ---------------------------------------------------------------------------

describe('parseMultiSelectToggleTrueKeys', () => {
  it('returns sorted keys with value true', () => {
    const answer = makeAttAnswer({
      field_type: 'multi_select_toggle',
      answer_text: JSON.stringify({ cooking: true, cleaning: false, baking: true }),
    });

    expect(parseMultiSelectToggleTrueKeys(answer)).toEqual(['baking', 'cooking']);
  });

  it('returns empty array for wrong field type', () => {
    expect(
      parseMultiSelectToggleTrueKeys(
        makeAttAnswer({ field_type: 'text', answer_text: '{"a":true}' }),
      ),
    ).toEqual([]);
  });

  it('returns empty array when answer_text is null', () => {
    expect(
      parseMultiSelectToggleTrueKeys(
        makeAttAnswer({ field_type: 'multi_select_toggle', answer_text: null }),
      ),
    ).toEqual([]);
  });

  it('returns empty array for non-object JSON', () => {
    expect(
      parseMultiSelectToggleTrueKeys(
        makeAttAnswer({ field_type: 'multi_select_toggle', answer_text: '["a"]' }),
      ),
    ).toEqual([]);
  });

  it('deduplicates keys that differ only in case', () => {
    const answer = makeAttAnswer({
      field_type: 'multi_select_toggle',
      answer_text: JSON.stringify({ Alpha: true, alpha: true }),
    });

    expect(parseMultiSelectToggleTrueKeys(answer)).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// parseMultiSelectToggleKeys
// ---------------------------------------------------------------------------

describe('parseMultiSelectToggleKeys', () => {
  it('returns all keys regardless of boolean value', () => {
    const answer = makeAttAnswer({
      field_type: 'multi_select_toggle',
      answer_text: JSON.stringify({ cooking: true, cleaning: false }),
    });

    expect(parseMultiSelectToggleKeys(answer)).toEqual(['cleaning', 'cooking']);
  });

  it('returns empty array for wrong field type', () => {
    expect(
      parseMultiSelectToggleKeys(
        makeAttAnswer({ field_type: 'select', answer_text: '{"a":true}' }),
      ),
    ).toEqual([]);
  });

  it('returns empty array when answer_text is null', () => {
    expect(
      parseMultiSelectToggleKeys(
        makeAttAnswer({ field_type: 'multi_select_toggle', answer_text: null }),
      ),
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseMultiSelectToggleMap
// ---------------------------------------------------------------------------

describe('parseMultiSelectToggleMap', () => {
  it('returns a boolean map for all valid entries', () => {
    const answer = makeAttAnswer({
      field_type: 'multi_select_toggle',
      answer_text: JSON.stringify({ cooking: true, cleaning: false }),
    });

    expect(parseMultiSelectToggleMap(answer)).toEqual({ cooking: true, cleaning: false });
  });

  it('skips entries with non-boolean values', () => {
    const answer = makeAttAnswer({
      field_type: 'multi_select_toggle',
      answer_text: JSON.stringify({ cooking: true, count: 42 }),
    });

    expect(parseMultiSelectToggleMap(answer)).toEqual({ cooking: true });
  });

  it('returns empty object for wrong field type', () => {
    expect(
      parseMultiSelectToggleMap(makeAttAnswer({ field_type: 'text', answer_text: '{"a":true}' })),
    ).toEqual({});
  });

  it('returns empty object when answer_text is null', () => {
    expect(
      parseMultiSelectToggleMap(
        makeAttAnswer({ field_type: 'multi_select_toggle', answer_text: null }),
      ),
    ).toEqual({});
  });

  it('returns empty object for malformed JSON', () => {
    expect(
      parseMultiSelectToggleMap(
        makeAttAnswer({ field_type: 'multi_select_toggle', answer_text: 'bad-json' }),
      ),
    ).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// parseMultiSelectToggleFilterValue
// ---------------------------------------------------------------------------

describe('parseMultiSelectToggleFilterValue', () => {
  it('returns null for empty or whitespace-only input', () => {
    expect(parseMultiSelectToggleFilterValue('')).toBeNull();
    expect(parseMultiSelectToggleFilterValue('   ')).toBeNull();
  });

  it('returns key-only entry with null expectedBoolean when no = is present', () => {
    expect(parseMultiSelectToggleFilterValue('cooking')).toEqual({
      key: 'cooking',
      expectedBoolean: null,
    });
  });

  it('returns true expectedBoolean for key=true', () => {
    expect(parseMultiSelectToggleFilterValue('cooking=true')).toEqual({
      key: 'cooking',
      expectedBoolean: true,
    });
  });

  it('returns false expectedBoolean for key=false', () => {
    expect(parseMultiSelectToggleFilterValue('cooking=false')).toEqual({
      key: 'cooking',
      expectedBoolean: false,
    });
  });

  it('returns full string as key with null expectedBoolean for unknown boolean value', () => {
    expect(parseMultiSelectToggleFilterValue('cooking=maybe')).toEqual({
      key: 'cooking=maybe',
      expectedBoolean: null,
    });
  });

  it('returns null when key part before = is empty', () => {
    expect(parseMultiSelectToggleFilterValue('=true')).toBeNull();
  });

  it('trims whitespace from key and value', () => {
    expect(parseMultiSelectToggleFilterValue('  cooking  =  true  ')).toEqual({
      key: 'cooking',
      expectedBoolean: true,
    });
  });
});

// ---------------------------------------------------------------------------
// parseTimeLabelToMinutes
// ---------------------------------------------------------------------------

describe('parseTimeLabelToMinutes', () => {
  it('parses AM time labels correctly', () => {
    expect(parseTimeLabelToMinutes('8AM')).toBe(8 * 60);
    expect(parseTimeLabelToMinutes('11:30AM')).toBe(11 * 60 + 30);
    expect(parseTimeLabelToMinutes('12AM')).toBe(0);
  });

  it('parses PM time labels correctly', () => {
    expect(parseTimeLabelToMinutes('1PM')).toBe(13 * 60);
    expect(parseTimeLabelToMinutes('12PM')).toBe(12 * 60);
    expect(parseTimeLabelToMinutes('11:59PM')).toBe(23 * 60 + 59);
  });

  it('parses NN (noon) as 12:00', () => {
    expect(parseTimeLabelToMinutes('12NN')).toBe(12 * 60);
  });

  it('parses MN (midnight) as 0', () => {
    expect(parseTimeLabelToMinutes('12MN')).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(parseTimeLabelToMinutes('9am')).toBe(9 * 60);
    expect(parseTimeLabelToMinutes('3pm')).toBe(15 * 60);
  });

  it('returns null for empty or unparseable input', () => {
    expect(parseTimeLabelToMinutes('')).toBeNull();
    expect(parseTimeLabelToMinutes('noon')).toBeNull();
    expect(parseTimeLabelToMinutes('25PM')).toBeNull();
    expect(parseTimeLabelToMinutes('9:99AM')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseChronologicalLabel
// ---------------------------------------------------------------------------

describe('parseChronologicalLabel', () => {
  it('returns null for empty string', () => {
    expect(parseChronologicalLabel('')).toBeNull();
    expect(parseChronologicalLabel('   ')).toBeNull();
  });

  it('parses a parseable timestamp string to a numeric value', () => {
    const result = parseChronologicalLabel('2026-07-22T08:00:00.000Z');
    expect(typeof result).toBe('number');
    expect(result).toBe(Date.parse('2026-07-22T08:00:00.000Z'));
  });

  it('parses a time label (e.g. 9AM) to a synthetic minute-based epoch', () => {
    const result = parseChronologicalLabel('9AM');
    expect(result).toBe(9 * 60 * 60 * 1000);
  });

  it('returns null when neither a date nor a time label', () => {
    expect(parseChronologicalLabel('not-a-date')).toBeNull();
  });

  it('orders time labels correctly (earlier < later)', () => {
    const morning = parseChronologicalLabel('9AM')!;
    const noon = parseChronologicalLabel('12NN')!;
    const afternoon = parseChronologicalLabel('3PM')!;

    expect(morning).toBeLessThan(noon);
    expect(noon).toBeLessThan(afternoon);
  });
});
