import type {
  AttendanceAnswerSummary,
  AttendeeSearchResult,
  RegistrationAnswerSummary,
} from '@/lib/domain/attendance';

import type { DynamicFieldOption, DynamicFieldRef, DynamicFieldSource } from '../types';
import {
  answerValue,
  normalizeValue,
  parseMultiSelectToggleKeys,
  parseMultiSelectToggleTrueKeys,
  parseMultiSelectValues,
} from './parsing';
import { toDynamicFieldToken } from './tokens';

export function sourcePriority(source: DynamicFieldSource): number {
  if (source === 'registration') {
    return 0;
  }

  if (source === 'attendance') {
    return 1;
  }

  if (source === 'member') {
    return 2;
  }

  return 3;
}

export function fieldFilterValues(
  answer: RegistrationAnswerSummary | AttendanceAnswerSummary,
): string[] {
  if (answer.field_type === 'multi_select') {
    return parseMultiSelectValues(answer);
  }

  if (answer.field_type === 'multi_select_toggle') {
    return parseMultiSelectToggleKeys(answer);
  }

  const value = answerValue(answer);
  return value ? [value] : [];
}

export function getAnswerSummaries(
  attendee: AttendeeSearchResult,
  source: DynamicFieldSource,
): Array<RegistrationAnswerSummary | AttendanceAnswerSummary> {
  if (source === 'registration') {
    return attendee.registration_answers;
  }

  if (source === 'attendance') {
    return attendee.attendance_answers;
  }

  return [];
}

export function findAnswerSummary(
  attendee: AttendeeSearchResult,
  field: DynamicFieldRef,
): RegistrationAnswerSummary | AttendanceAnswerSummary | null {
  // Handle static fields (role, category) and direct member fields.
  if (field.source === 'role' || field.source === 'category' || field.source === 'member') {
    return null;
  }

  const answers = getAnswerSummaries(attendee, field.source);
  return answers.find((item) => item.field_key === field.fieldKey) ?? null;
}

export function findFieldGroupingValues(
  attendee: AttendeeSearchResult,
  field: DynamicFieldRef,
): string[] {
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

export function matchesRole(attendeeRole: string | null, allowedRoles: string[]): boolean {
  const roleTokens = new Set(allowedRoles.map((role) => normalizeValue(role)));
  return roleTokens.has(normalizeValue(attendeeRole ?? ''));
}
