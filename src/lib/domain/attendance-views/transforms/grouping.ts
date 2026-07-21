import type {
  AttendanceAnswerSummary,
  AttendeeSearchResult,
  RegistrationAnswerSummary,
} from '@/lib/domain/attendance';

import type {
  AttendeeViewConfig,
  AttendeeViewGroupSort,
  GroupByFieldRef,
  RegistrantViewGroup,
} from '../types';
import { findAnswerSummary, findFieldGroupingValues } from './field-access';
import {
  normalizeValue,
  parseChronologicalLabel,
  parseMultiSelectToggleFilterValue,
} from './parsing';

export function buildGroupKeys(
  attendee: AttendeeSearchResult,
  config: AttendeeViewConfig,
): string[] {
  if (config.groupBy.length === 0) return ['all'];

  let keys = [''];

  for (const field of config.groupBy) {
    // For static fields like role and category, skip the findAnswerSummary check.
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

export function buildGroupLabel(groupKey: string, config: AttendeeViewConfig): string {
  if (config.groupBy.length === 0) return 'All attendees';

  const parts = groupKey.split('|||');
  return parts.join(' / ');
}

export function compareBySortMode(
  aSegment: string,
  bSegment: string,
  sortMode: AttendeeViewGroupSort,
  aCount: number,
  bCount: number,
): number {
  if (sortMode === 'size_desc') {
    if (bCount !== aCount) {
      return bCount - aCount;
    }

    return aSegment.localeCompare(bSegment);
  }

  if (sortMode === 'size_asc') {
    if (aCount !== bCount) {
      return aCount - bCount;
    }

    return aSegment.localeCompare(bSegment);
  }

  if (sortMode === 'time_asc' || sortMode === 'time_desc') {
    const aChronologicalValue = parseChronologicalLabel(aSegment);
    const bChronologicalValue = parseChronologicalLabel(bSegment);

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

    return aSegment.localeCompare(bSegment);
  }

  if (sortMode === 'label_desc') {
    return bSegment.localeCompare(aSegment);
  }

  return aSegment.localeCompare(bSegment);
}

export function sortGroups(groups: RegistrantViewGroup[], groupBy: GroupByFieldRef[]) {
  return [...groups].sort((a, b) => {
    const aSegments = a.key.split('|||');
    const bSegments = b.key.split('|||');
    const maxLevels = Math.max(groupBy.length, aSegments.length, bSegments.length);

    for (let level = 0; level < maxLevels; level += 1) {
      const sortMode = groupBy[level]?.groupSort ?? 'label_asc';
      const aSegment = aSegments[level] ?? '';
      const bSegment = bSegments[level] ?? '';

      const compareResult = compareBySortMode(
        aSegment,
        bSegment,
        sortMode,
        a.registrants.length,
        b.registrants.length,
      );

      if (compareResult !== 0) {
        return compareResult;
      }
    }

    return a.label.localeCompare(b.label);
  });
}
