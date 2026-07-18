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

function getAnswerSummaries(
  attendee: AttendeeSearchResult,
  source: DynamicFieldSource,
): Array<RegistrationAnswerSummary | AttendanceAnswerSummary> {
  return source === 'registration' ? attendee.registration_answers : attendee.attendance_answers;
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
        const value = answerValue(answer);

        if (!current) {
          byToken.set(token, {
            ...field,
            token,
            values: value ? [value] : [],
          });
          continue;
        }

        if (value && !current.values.includes(value)) {
          current.values.push(value);
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

function findFieldValue(attendee: AttendeeSearchResult, field: DynamicFieldRef): string {
  const answers = getAnswerSummaries(attendee, field.source);
  const answer = answers.find((item) => item.field_key === field.fieldKey);
  if (!answer) return EMPTY_VALUE;
  return answerValue(answer);
}

function matchesDynamicFilter(attendee: AttendeeSearchResult, filter: DynamicFieldFilter): boolean {
  const fieldValue = findFieldValue(attendee, filter.field);
  if (!fieldValue) return false;
  return normalizeValue(fieldValue) === normalizeValue(filter.value);
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
    answers: attendee.attendance_answers.map((answer) => toAttendanceAnswer(attendee, answer)),
  };
}

function buildGroupKey(attendee: AttendeeSearchResult, config: AttendeeViewConfig): string {
  if (config.groupBy.length === 0) return 'all';

  const parts: string[] = [];
  for (const field of config.groupBy) {
    const value = findFieldValue(attendee, field);
    if (!value) return EMPTY_VALUE;
    parts.push(value);
  }

  return parts.join('|||');
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
    .filter((attendee) =>
      config.dynamicFilters.every((filter) => matchesDynamicFilter(attendee, filter)),
    );

  const groupMap = new Map<string, AttendeeSearchResult[]>();
  for (const attendee of filteredAttendees) {
    const key = buildGroupKey(attendee, config);

    // Exclude incomplete grouping values by default for cleaner v1 views.
    if (!key) continue;

    const current = groupMap.get(key);
    if (current) {
      current.push(attendee);
      continue;
    }
    groupMap.set(key, [attendee]);
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
