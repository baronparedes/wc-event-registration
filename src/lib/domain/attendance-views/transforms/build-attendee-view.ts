import type { AttendeeSearchResult } from '@/lib/domain/attendance';

import type { AttendeeViewConfig, BuildAttendeeViewResult, RegistrantViewGroup } from '../types';
import { matchesBaseFilters, matchesDynamicFilters } from './filtering';
import { buildGroupKeys, buildGroupLabel, sortGroups } from './grouping';
import { attendeeToRegistrant } from './mappers';

function compareRegistrantsByDisplayName(
  a: RegistrantViewGroup['registrants'][number],
  b: RegistrantViewGroup['registrants'][number],
): number {
  const aDisplayName = `${a.nickname} ${a.last_name}`.trim();
  const bDisplayName = `${b.nickname} ${b.last_name}`.trim();
  const displayNameComparison = aDisplayName.localeCompare(bDisplayName);
  if (displayNameComparison !== 0) {
    return displayNameComparison;
  }

  return a.full_name.localeCompare(b.full_name);
}

export function buildAttendeeView(
  attendees: AttendeeSearchResult[],
  config: AttendeeViewConfig,
): BuildAttendeeViewResult {
  const filteredAttendees = attendees
    .filter((attendee) => matchesBaseFilters(attendee, config))
    .filter((attendee) =>
      matchesDynamicFilters(
        attendee,
        config.dynamicFilters,
        config.dynamicFilterCombination ?? 'and',
        config.dynamicFilterExpression,
      ),
    );

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
      registrants: groupAttendees.map(attendeeToRegistrant).sort(compareRegistrantsByDisplayName),
    }),
  );

  const groups = sortGroups(unsortedGroups, config.groupBy);

  return {
    filteredAttendees,
    groups: groups.length > 0 ? groups : [{ key: 'all', label: 'All attendees', registrants: [] }],
  };
}
