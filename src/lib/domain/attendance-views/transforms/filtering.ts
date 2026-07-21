import type { AttendeeSearchResult } from '@/lib/domain/attendance';

import type { AttendeeViewConfig, DynamicFieldFilter, DynamicFilterCombination } from '../types';
import { findAnswerSummary } from './field-access';
import {
  answerValue,
  matchesRelativeDateLiteral,
  normalizeValue,
  parseMultiSelectToggleFilterValue,
  parseMultiSelectToggleKeys,
  parseMultiSelectToggleMap,
  parseMultiSelectValues,
} from './parsing';
import { toDynamicFieldToken } from './tokens';

const EMPTY_VALUE = '';

export function matchesBaseFilters(
  attendee: AttendeeSearchResult,
  config: AttendeeViewConfig,
): boolean {
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

export function matchesDynamicFilter(
  attendee: AttendeeSearchResult,
  filter: DynamicFieldFilter,
): boolean {
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

export function toFilterFieldToken(filter: DynamicFieldFilter): string {
  return toDynamicFieldToken(filter.field);
}

export function matchesDynamicFilters(
  attendee: AttendeeSearchResult,
  filters: DynamicFieldFilter[],
  combination: DynamicFilterCombination = 'and',
): boolean {
  if (filters.length === 0) {
    return true;
  }

  if (combination === 'or') {
    return filters.some((filter) => matchesDynamicFilter(attendee, filter));
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
