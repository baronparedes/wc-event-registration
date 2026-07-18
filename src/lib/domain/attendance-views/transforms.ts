import type {
  AttendanceAnswer,
  AttendanceAnswerSummary,
  AttendeeSearchResult,
  RegistrantAttendanceRow,
  RegistrationAnswerSummary,
} from '@/lib/domain/attendance';

import type {
  AttendeeViewConfig,
  BuildAttendeeViewResult,
  DynamicFieldFilter,
  DynamicFieldOption,
  DynamicFieldRef,
  DynamicFieldSource,
  RegistrantViewGroup,
} from './types';

const EMPTY_VALUE = '';
const NULL_ANSWER_DATE = '1970-01-01T00:00:00.000Z';

function sourcePriority(source: DynamicFieldSource): number {
  return source === 'registration' ? 0 : 1;
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase();
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

  if (
    config.role !== 'all' &&
    normalizeValue(attendee.role ?? EMPTY_VALUE) !== normalizeValue(config.role)
  ) {
    return false;
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
    const values = parseMultiSelectToggleKeys(answer);
    if (values.length === 0) {
      return false;
    }

    const normalizedFilter = normalizeValue(filter.value);
    return values.some((value) => normalizeValue(value) === normalizedFilter);
  }

  const fieldValue = answerValue(answer);
  if (!fieldValue) {
    return false;
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
      const allowedValues = new Set(
        sameFieldFilters.map((filter) => normalizeValue(filter.value)).filter(Boolean),
      );
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

  const groups: RegistrantViewGroup[] = [...groupMap.entries()]
    .map(([key, groupAttendees]) => ({
      key,
      label: buildGroupLabel(key, config),
      registrants: groupAttendees
        .map(attendeeToRegistrant)
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return {
    filteredAttendees,
    groups: groups.length > 0 ? groups : [{ key: 'all', label: 'All attendees', registrants: [] }],
  };
}
