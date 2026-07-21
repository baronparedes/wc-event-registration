import type {
  AttendanceAnswer,
  AttendanceAnswerSummary,
  AttendeeSearchResult,
  RegistrantAttendanceRow,
  RegistrationAnswerSummary,
} from '@/lib/domain/attendance';

import type {
  AttendeeViewConfig,
  AttendeeViewGroupSort,
  BuildAttendeeViewResult,
  DynamicFieldFilter,
  DynamicFieldOption,
  DynamicFieldRef,
  DynamicFieldSource,
  RegistrantViewGroup,
} from './types';

const EMPTY_VALUE = '';
const NULL_ANSWER_DATE = '1970-01-01T00:00:00.000Z';

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

function sourcePriority(source: DynamicFieldSource): number {
  return source === 'registration' ? 0 : 1;
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseRelativeDateLiteral(rawValue: string): RelativeDateLiteral | null {
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

function parseDateValue(rawValue: string): Date | null {
  const timestamp = Date.parse(rawValue);
  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp);
}

function matchesRelativeDateLiteral(
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

function answerValue(answer: RegistrationAnswerSummary | AttendanceAnswerSummary): string {
  if (answer.answer_text !== null) return answer.answer_text.trim();
  if (answer.answer_number !== null) return String(answer.answer_number);
  return EMPTY_VALUE;
}

function parseMultiSelectValues(
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

function parseMultiSelectToggleTrueKeys(
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

function parseMultiSelectToggleKeys(
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

function parseMultiSelectToggleMap(
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

function parseMultiSelectToggleFilterValue(rawFilterValue: string): {
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

function fieldFilterValues(answer: RegistrationAnswerSummary | AttendanceAnswerSummary): string[] {
  if (answer.field_type === 'multi_select') {
    return parseMultiSelectValues(answer);
  }

  if (answer.field_type === 'multi_select_toggle') {
    return parseMultiSelectToggleKeys(answer);
  }

  const value = answerValue(answer);
  return value ? [value] : [];
}

function getAnswerSummaries(
  attendee: AttendeeSearchResult,
  source: DynamicFieldSource,
): Array<RegistrationAnswerSummary | AttendanceAnswerSummary> {
  return source === 'registration' ? attendee.registration_answers : attendee.attendance_answers;
}

function findAnswerSummary(
  attendee: AttendeeSearchResult,
  field: DynamicFieldRef,
): RegistrationAnswerSummary | AttendanceAnswerSummary | null {
  // Handle static fields (role, category)
  if (field.source === 'role' || field.source === 'category') {
    return null; // These are not actual answers, handled separately in findFieldGroupingValues
  }

  const answers = getAnswerSummaries(attendee, field.source);
  return answers.find((item) => item.field_key === field.fieldKey) ?? null;
}

export function toDynamicFieldToken(field: DynamicFieldRef): string {
  return `${field.source}:${field.fieldKey}`;
}

export function fromDynamicFieldToken(
  token: string,
  fields: DynamicFieldOption[],
): DynamicFieldRef | null {
  return fields.find((field) => field.token === token) ?? null;
}

export function collectDynamicFieldOptions(
  attendees: AttendeeSearchResult[],
  seededFields: DynamicFieldRef[] = [],
): DynamicFieldOption[] {
  const byToken = new Map<string, DynamicFieldOption>();

  for (const field of seededFields) {
    const token = toDynamicFieldToken(field);
    byToken.set(token, {
      ...field,
      token,
      values: [],
    });
  }

  for (const attendee of attendees) {
    const allSources: Array<{
      source: DynamicFieldSource;
      answers: Array<RegistrationAnswerSummary | AttendanceAnswerSummary>;
    }> = [
      { source: 'registration', answers: attendee.registration_answers },
      { source: 'attendance', answers: attendee.attendance_answers },
    ];

    for (const sourceSet of allSources) {
      for (const answer of sourceSet.answers) {
        const field: DynamicFieldRef = {
          source: sourceSet.source,
          fieldKey: answer.field_key,
          label: answer.label,
          sortOrder: undefined,
          fieldType: answer.field_type,
        };
        const token = toDynamicFieldToken(field);
        const current = byToken.get(token);
        const values = fieldFilterValues(answer);

        if (!current) {
          byToken.set(token, {
            ...field,
            token,
            values,
          });
          continue;
        }

        for (const value of values) {
          if (!current.values.includes(value)) {
            current.values.push(value);
          }
        }

        if (current.fieldType === undefined) {
          current.fieldType = answer.field_type;
        }
      }
    }
  }

  return [...byToken.values()]
    .map((field) => ({
      ...field,
      values: [...field.values].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      const sourceDiff = sourcePriority(a.source) - sourcePriority(b.source);
      if (sourceDiff !== 0) return sourceDiff;

      const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;

      return a.label.localeCompare(b.label);
    });
}

function matchesBaseFilters(attendee: AttendeeSearchResult, config: AttendeeViewConfig): boolean {
  const normalizedQuery = normalizeValue(config.nameOrMemberQuery);
  if (normalizedQuery.length > 0) {
    const fullName = normalizeValue(attendee.full_name);
    const memberId = normalizeValue(attendee.member_id ?? EMPTY_VALUE);
    if (!fullName.includes(normalizedQuery) && !memberId.includes(normalizedQuery)) {
      return false;
    }
  }

  if (config.role.length > 0) {
    const roleTokens = new Set(config.role.map((role) => normalizeValue(role)));
    const attendeeRole = normalizeValue(attendee.role ?? EMPTY_VALUE);
    if (!roleTokens.has(attendeeRole)) {
      return false;
    }
  }

  if (
    config.category !== 'all' &&
    normalizeValue(attendee.category ?? EMPTY_VALUE) !== normalizeValue(config.category)
  ) {
    return false;
  }

  if (config.checkInStatus !== 'all' && attendee.check_in_status !== config.checkInStatus) {
    return false;
  }

  return true;
}

function findFieldGroupingValues(attendee: AttendeeSearchResult, field: DynamicFieldRef): string[] {
  // Handle static fields
  if (field.source === 'role') {
    return attendee.role ? [attendee.role] : [];
  }

  if (field.source === 'category') {
    return attendee.category ? [attendee.category] : [];
  }

  const answer = findAnswerSummary(attendee, field);
  if (!answer) {
    return [];
  }

  if (answer.field_type === 'multi_select') {
    return parseMultiSelectValues(answer);
  }

  if (answer.field_type === 'multi_select_toggle') {
    return parseMultiSelectToggleTrueKeys(answer);
  }

  const value = answerValue(answer);
  return value ? [value] : [];
}

function matchesDynamicFilter(attendee: AttendeeSearchResult, filter: DynamicFieldFilter): boolean {
  const answer = findAnswerSummary(attendee, filter.field);
  if (!answer) {
    return false;
  }

  if (answer.field_type === 'multi_select') {
    const values = parseMultiSelectValues(answer);
    if (values.length === 0) {
      return false;
    }

    const normalizedFilter = normalizeValue(filter.value);
    return values.some((value) => normalizeValue(value) === normalizedFilter);
  }

  if (answer.field_type === 'multi_select_toggle') {
    const parsedFilter = parseMultiSelectToggleFilterValue(filter.value);
    if (!parsedFilter) {
      return false;
    }

    const normalizedFilterKey = normalizeValue(parsedFilter.key);

    if (parsedFilter.expectedBoolean === null) {
      const values = parseMultiSelectToggleKeys(answer);
      if (values.length === 0) {
        return false;
      }

      return values.some((value) => normalizeValue(value) === normalizedFilterKey);
    }

    const toggleMap = parseMultiSelectToggleMap(answer);
    return Object.entries(toggleMap).some(
      ([key, value]) =>
        normalizeValue(key) === normalizedFilterKey && value === parsedFilter.expectedBoolean,
    );
  }

  const fieldValue = answerValue(answer);
  if (!fieldValue) {
    return false;
  }

  if (answer.field_type === 'date' || answer.field_type === 'datetime') {
    const relativeDateMatch = matchesRelativeDateLiteral(fieldValue, filter.value);
    if (relativeDateMatch !== null) {
      return relativeDateMatch;
    }
  }

  return normalizeValue(fieldValue) === normalizeValue(filter.value);
}

function toFilterFieldToken(filter: DynamicFieldFilter): string {
  return toDynamicFieldToken(filter.field);
}

function matchesDynamicFilters(
  attendee: AttendeeSearchResult,
  filters: DynamicFieldFilter[],
): boolean {
  if (filters.length === 0) {
    return true;
  }

  const filtersByField = new Map<string, DynamicFieldFilter[]>();
  for (const filter of filters) {
    const token = toFilterFieldToken(filter);
    const current = filtersByField.get(token);
    if (current) {
      current.push(filter);
      continue;
    }

    filtersByField.set(token, [filter]);
  }

  // Same field values are OR-ed; different fields remain AND-ed.
  for (const fieldFilters of filtersByField.values()) {
    const hasMatch = fieldFilters.some((filter) => matchesDynamicFilter(attendee, filter));
    if (!hasMatch) {
      return false;
    }
  }

  return true;
}

function toAttendanceAnswer(
  attendee: AttendeeSearchResult,
  answer: AttendanceAnswerSummary,
): AttendanceAnswer {
  const baseKey =
    attendee.attendee_kind === 'public'
      ? attendee.public_registration_id
      : attendee.registration_id;

  return {
    id: `${baseKey ?? attendee.registration_id}:${answer.attendance_field_id}`,
    registration_id: attendee.attendee_kind === 'public' ? null : attendee.registration_id,
    public_registration_id:
      attendee.attendee_kind === 'public' ? attendee.public_registration_id : null,
    attendance_field_id: answer.attendance_field_id,
    answer_text: answer.answer_text,
    answer_number: answer.answer_number,
    created_at: NULL_ANSWER_DATE,
    updated_at: NULL_ANSWER_DATE,
  };
}

export function attendeeToRegistrant(attendee: AttendeeSearchResult): RegistrantAttendanceRow {
  return {
    attendee_kind: attendee.attendee_kind,
    registration_id: attendee.attendee_kind === 'public' ? null : attendee.registration_id,
    public_registration_id:
      attendee.attendee_kind === 'public' ? attendee.public_registration_id : null,
    member_id: attendee.member_id,
    full_name: attendee.full_name,
    email: attendee.email,
    role: attendee.role,
    category: attendee.category,
    check_in_status: attendee.check_in_status,
    answers: attendee.attendance_answers.map((answer) => toAttendanceAnswer(attendee, answer)),
  };
}

function buildGroupKeys(attendee: AttendeeSearchResult, config: AttendeeViewConfig): string[] {
  if (config.groupBy.length === 0) return ['all'];

  let keys = [''];

  for (const field of config.groupBy) {
    // For static fields like role and category, skip the findAnswerSummary check
    let answer: RegistrationAnswerSummary | AttendanceAnswerSummary | null = null;
    if (field.source !== 'role' && field.source !== 'category') {
      answer = findAnswerSummary(attendee, field);
      if (!answer) {
        return [];
      }
    }

    let values = findFieldGroupingValues(attendee, field);

    const sameFieldFilters = config.dynamicFilters.filter(
      (filter) => filter.field.source === field.source && filter.field.fieldKey === field.fieldKey,
    );

    if (
      answer &&
      sameFieldFilters.length > 0 &&
      (answer.field_type === 'multi_select' || answer.field_type === 'multi_select_toggle')
    ) {
      const allowedValues = new Set<string>();
      for (const filter of sameFieldFilters) {
        if (answer.field_type === 'multi_select_toggle') {
          const parsedFilter = parseMultiSelectToggleFilterValue(filter.value);
          if (parsedFilter) {
            allowedValues.add(normalizeValue(parsedFilter.key));
          }
          continue;
        }

        const normalized = normalizeValue(filter.value);
        if (normalized) {
          allowedValues.add(normalized);
        }
      }

      values = values.filter((value) => allowedValues.has(normalizeValue(value)));
    }

    if (values.length === 0) {
      return [];
    }

    const nextKeys: string[] = [];
    for (const key of keys) {
      for (const value of values) {
        nextKeys.push(key ? `${key}|||${value}` : value);
      }
    }

    keys = nextKeys;
  }

  return keys;
}

function buildGroupLabel(groupKey: string, config: AttendeeViewConfig): string {
  if (config.groupBy.length === 0) return 'All attendees';

  const parts = groupKey.split('|||');
  return parts.join(' / ');
}

function getPrimaryGroupLabelSegment(rawLabel: string): string {
  return rawLabel.split(' / ')[0]?.trim() ?? '';
}

function parseTimeLabelToMinutes(rawLabel: string): number | null {
  const firstSegment = getPrimaryGroupLabelSegment(rawLabel).toUpperCase();
  if (!firstSegment) {
    return null;
  }

  const match = firstSegment.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM|NN|MN)$/);
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

function parseChronologicalLabel(rawLabel: string): number | null {
  const firstSegment = getPrimaryGroupLabelSegment(rawLabel);
  if (!firstSegment) {
    return null;
  }

  const parsedTimestamp = Date.parse(firstSegment);
  if (!Number.isNaN(parsedTimestamp)) {
    return parsedTimestamp;
  }

  const minutes = parseTimeLabelToMinutes(firstSegment);
  if (minutes === null) {
    return null;
  }

  // Use a synthetic epoch-based timestamp for time-only labels.
  return minutes * 60 * 1000;
}

function sortGroups(groups: RegistrantViewGroup[], sortMode: AttendeeViewGroupSort) {
  const byLabelAsc = (a: RegistrantViewGroup, b: RegistrantViewGroup) =>
    a.label.localeCompare(b.label);

  return [...groups].sort((a, b) => {
    if (sortMode === 'size_desc') {
      if (b.registrants.length !== a.registrants.length) {
        return b.registrants.length - a.registrants.length;
      }

      return byLabelAsc(a, b);
    }

    if (sortMode === 'size_asc') {
      if (a.registrants.length !== b.registrants.length) {
        return a.registrants.length - b.registrants.length;
      }

      return byLabelAsc(a, b);
    }

    if (sortMode === 'time_asc' || sortMode === 'time_desc') {
      const aChronologicalValue = parseChronologicalLabel(a.label);
      const bChronologicalValue = parseChronologicalLabel(b.label);

      if (
        aChronologicalValue !== null &&
        bChronologicalValue !== null &&
        aChronologicalValue !== bChronologicalValue
      ) {
        return sortMode === 'time_asc'
          ? aChronologicalValue - bChronologicalValue
          : bChronologicalValue - aChronologicalValue;
      }

      if (aChronologicalValue !== null && bChronologicalValue === null) {
        return -1;
      }

      if (aChronologicalValue === null && bChronologicalValue !== null) {
        return 1;
      }

      return byLabelAsc(a, b);
    }

    if (sortMode === 'label_desc') {
      return b.label.localeCompare(a.label);
    }

    return byLabelAsc(a, b);
  });
}

export function buildAttendeeView(
  attendees: AttendeeSearchResult[],
  config: AttendeeViewConfig,
): BuildAttendeeViewResult {
  const filteredAttendees = attendees
    .filter((attendee) => matchesBaseFilters(attendee, config))
    .filter((attendee) => matchesDynamicFilters(attendee, config.dynamicFilters));

  const groupMap = new Map<string, AttendeeSearchResult[]>();
  for (const attendee of filteredAttendees) {
    const keys = buildGroupKeys(attendee, config);

    // Exclude incomplete grouping values by default for cleaner v1 views.
    if (keys.length === 0) continue;

    for (const key of keys) {
      const current = groupMap.get(key);
      if (current) {
        current.push(attendee);
        continue;
      }

      groupMap.set(key, [attendee]);
    }
  }

  const unsortedGroups: RegistrantViewGroup[] = [...groupMap.entries()].map(
    ([key, groupAttendees]) => ({
      key,
      label: buildGroupLabel(key, config),
      registrants: groupAttendees
        .map(attendeeToRegistrant)
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    }),
  );

  const groups = sortGroups(unsortedGroups, config.groupSort ?? 'label_asc');

  return {
    filteredAttendees,
    groups: groups.length > 0 ? groups : [{ key: 'all', label: 'All attendees', registrants: [] }],
  };
}
