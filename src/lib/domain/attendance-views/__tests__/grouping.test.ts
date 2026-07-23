import { describe, expect, it } from 'vitest';

import type { AttendeeSearchResult } from '@/lib/domain/attendance';

import {
  buildGroupKeys,
  buildGroupLabel,
  compareBySortMode,
  sortGroups,
} from '../transforms/grouping';
import type { AttendeeViewConfig, GroupByFieldRef, RegistrantViewGroup } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAttendee(overrides: Partial<AttendeeSearchResult> = {}): AttendeeSearchResult {
  return {
    attendee_kind: 'registered',
    registration_id: 'reg-1',
    public_registration_id: null,
    user_id: 'user-1',
    member_id: 'M-001',
    nickname: 'Alpha',
    last_name: 'Member',
    full_name: 'Alpha Member',
    email: 'test@example.com',
    role: 'Member',
    category: 'Adult',
    registration_status: 'submitted',
    submitted_at: '2026-07-22T10:00:00.000Z',
    check_in_status: 'not_checked_in',
    official_check_in_time: null,
    registration_answers: [],
    attendance_answers: [],
    ...overrides,
  };
}

const baseConfig: AttendeeViewConfig = {
  nameOrMemberQuery: '',
  role: [],
  category: 'all',
  checkInStatus: 'all',
  dynamicFilters: [],
  groupBy: [],
  visibleFields: [],
};

function makeGroup(key: string, registrantCount: number): RegistrantViewGroup {
  return {
    key,
    label: key,
    registrants: Array.from({ length: registrantCount }, () => ({
      registration_id: null,
      public_registration_id: null,
      nickname: 'Name',
      last_name: 'Person',
      full_name: 'Name Person',
      member_id: null,
      email: null,
      attendee_kind: 'registered' as const,
      check_in_status: 'not_checked_in' as const,
      official_check_in_time: null,
      answers: [],
    })),
  };
}

// ---------------------------------------------------------------------------
// buildGroupKeys
// ---------------------------------------------------------------------------

describe('buildGroupKeys', () => {
  it('returns ["all"] when no groupBy fields are configured', () => {
    const attendee = makeAttendee();
    expect(buildGroupKeys(attendee, { ...baseConfig, groupBy: [] })).toEqual(['all']);
  });

  it('returns the role value when grouping by role', () => {
    const attendee = makeAttendee({ role: 'Volunteer' });
    const config: AttendeeViewConfig = {
      ...baseConfig,
      groupBy: [{ source: 'role', fieldKey: 'role', label: 'Role' }],
    };

    expect(buildGroupKeys(attendee, config)).toEqual(['Volunteer']);
  });

  it('returns the category value when grouping by category', () => {
    const attendee = makeAttendee({ category: 'Youth' });
    const config: AttendeeViewConfig = {
      ...baseConfig,
      groupBy: [{ source: 'category', fieldKey: 'category', label: 'Category' }],
    };

    expect(buildGroupKeys(attendee, config)).toEqual(['Youth']);
  });

  it('returns an empty array when role is null and grouping by role', () => {
    const attendee = makeAttendee({ role: null });
    const config: AttendeeViewConfig = {
      ...baseConfig,
      groupBy: [{ source: 'role', fieldKey: 'role', label: 'Role' }],
    };

    expect(buildGroupKeys(attendee, config)).toEqual([]);
  });

  it('returns composite key separated by ||| for multi-level grouping', () => {
    const attendee = makeAttendee({ role: 'Member', category: 'Adult' });
    const config: AttendeeViewConfig = {
      ...baseConfig,
      groupBy: [
        { source: 'role', fieldKey: 'role', label: 'Role' },
        { source: 'category', fieldKey: 'category', label: 'Category' },
      ],
    };

    expect(buildGroupKeys(attendee, config)).toEqual(['Member|||Adult']);
  });

  it('returns empty array when a required registration-answer field is missing', () => {
    const attendee = makeAttendee({ registration_answers: [] });
    const config: AttendeeViewConfig = {
      ...baseConfig,
      groupBy: [{ source: 'registration', fieldKey: 'service', label: 'Service' }],
    };

    expect(buildGroupKeys(attendee, config)).toEqual([]);
  });

  it('uses field answer text as group key for registration fields', () => {
    const attendee = makeAttendee({
      registration_answers: [
        {
          event_field_id: 'field-1',
          field_type: 'select',
          field_key: 'service',
          label: 'Service',
          answer_text: '9AM',
          answer_number: null,
        },
      ],
    });
    const config: AttendeeViewConfig = {
      ...baseConfig,
      groupBy: [{ source: 'registration', fieldKey: 'service', label: 'Service' }],
    };

    expect(buildGroupKeys(attendee, config)).toEqual(['9AM']);
  });

  it('fans out multi_select answers into multiple group keys', () => {
    const attendee = makeAttendee({
      registration_answers: [
        {
          event_field_id: 'field-1',
          field_type: 'multi_select',
          field_key: 'service',
          label: 'Service',
          answer_text: JSON.stringify(['9AM', '12NN']),
          answer_number: null,
        },
      ],
    });
    const config: AttendeeViewConfig = {
      ...baseConfig,
      groupBy: [{ source: 'registration', fieldKey: 'service', label: 'Service' }],
    };

    expect(buildGroupKeys(attendee, config)).toEqual(['12NN', '9AM']);
  });

  it('filters multi_select keys when same-field dynamic filters are present', () => {
    const attendee = makeAttendee({
      registration_answers: [
        {
          event_field_id: 'field-1',
          field_type: 'multi_select',
          field_key: 'service',
          label: 'Service',
          answer_text: JSON.stringify(['9AM', '12NN', '3PM']),
          answer_number: null,
        },
      ],
    });
    const fieldRef = { source: 'registration' as const, fieldKey: 'service', label: 'Service' };
    const config: AttendeeViewConfig = {
      ...baseConfig,
      dynamicFilters: [{ field: fieldRef, value: '9AM' }],
      groupBy: [fieldRef],
    };

    expect(buildGroupKeys(attendee, config)).toEqual(['9AM']);
  });
});

// ---------------------------------------------------------------------------
// buildGroupLabel
// ---------------------------------------------------------------------------

describe('buildGroupLabel', () => {
  it('returns "All attendees" when groupBy is empty', () => {
    expect(buildGroupLabel('all', { ...baseConfig, groupBy: [] })).toBe('All attendees');
  });

  it('returns the key as the label for single-level grouping', () => {
    const config: AttendeeViewConfig = {
      ...baseConfig,
      groupBy: [{ source: 'role', fieldKey: 'role', label: 'Role' }],
    };

    expect(buildGroupLabel('Volunteer', config)).toBe('Volunteer');
  });

  it('joins composite key segments with " / " for multi-level grouping', () => {
    const config: AttendeeViewConfig = {
      ...baseConfig,
      groupBy: [
        { source: 'role', fieldKey: 'role', label: 'Role' },
        { source: 'category', fieldKey: 'category', label: 'Category' },
      ],
    };

    expect(buildGroupLabel('Member|||Adult', config)).toBe('Member / Adult');
  });
});

// ---------------------------------------------------------------------------
// compareBySortMode
// ---------------------------------------------------------------------------

describe('compareBySortMode', () => {
  it('sorts label_asc alphabetically', () => {
    expect(compareBySortMode('Alpha', 'Beta', 'label_asc', 0, 0)).toBeLessThan(0);
    expect(compareBySortMode('Zebra', 'Alpha', 'label_asc', 0, 0)).toBeGreaterThan(0);
    expect(compareBySortMode('Same', 'Same', 'label_asc', 0, 0)).toBe(0);
  });

  it('sorts label_desc reverse-alphabetically', () => {
    expect(compareBySortMode('Zebra', 'Alpha', 'label_desc', 0, 0)).toBeLessThan(0);
    expect(compareBySortMode('Alpha', 'Zebra', 'label_desc', 0, 0)).toBeGreaterThan(0);
  });

  it('sorts size_desc by count descending, then alpha', () => {
    expect(compareBySortMode('A', 'B', 'size_desc', 10, 5)).toBeLessThan(0);
    expect(compareBySortMode('A', 'B', 'size_desc', 5, 10)).toBeGreaterThan(0);
    // Equal count → alpha tiebreak
    expect(compareBySortMode('Alpha', 'Beta', 'size_desc', 5, 5)).toBeLessThan(0);
  });

  it('sorts size_asc by count ascending, then alpha', () => {
    expect(compareBySortMode('A', 'B', 'size_asc', 3, 10)).toBeLessThan(0);
    expect(compareBySortMode('A', 'B', 'size_asc', 10, 3)).toBeGreaterThan(0);
    // Equal count → alpha tiebreak
    expect(compareBySortMode('Alpha', 'Beta', 'size_asc', 5, 5)).toBeLessThan(0);
  });

  it('sorts time_asc by parsed time value ascending', () => {
    // 9AM < 12NN
    expect(compareBySortMode('9AM', '12NN', 'time_asc', 0, 0)).toBeLessThan(0);
    expect(compareBySortMode('12NN', '9AM', 'time_asc', 0, 0)).toBeGreaterThan(0);
  });

  it('sorts time_desc by parsed time value descending', () => {
    expect(compareBySortMode('12NN', '9AM', 'time_desc', 0, 0)).toBeLessThan(0);
    expect(compareBySortMode('9AM', '12NN', 'time_desc', 0, 0)).toBeGreaterThan(0);
  });

  it('places parseable time labels before non-parseable ones in time sort', () => {
    // 9AM is parseable, "unknown" is not
    expect(compareBySortMode('9AM', 'unknown', 'time_asc', 0, 0)).toBeLessThan(0);
    expect(compareBySortMode('unknown', '9AM', 'time_asc', 0, 0)).toBeGreaterThan(0);
  });

  it('falls back to alpha when both segments are non-parseable in time sort', () => {
    expect(compareBySortMode('Alpha', 'Beta', 'time_asc', 0, 0)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// sortGroups
// ---------------------------------------------------------------------------

describe('sortGroups', () => {
  it('returns a new sorted array without mutating the original', () => {
    const groups = [makeGroup('Zebra', 2), makeGroup('Alpha', 2)];
    const groupBy: GroupByFieldRef[] = [
      { source: 'role', fieldKey: 'role', label: 'Role', groupSort: 'label_asc' },
    ];

    const sorted = sortGroups(groups, groupBy);

    expect(sorted[0].key).toBe('Alpha');
    expect(sorted[1].key).toBe('Zebra');
    expect(groups[0].key).toBe('Zebra'); // original unchanged
  });

  it('sorts by size_desc when groupSort is size_desc', () => {
    const groups = [makeGroup('Small', 2), makeGroup('Large', 10)];
    const groupBy: GroupByFieldRef[] = [
      { source: 'role', fieldKey: 'role', label: 'Role', groupSort: 'size_desc' },
    ];

    const sorted = sortGroups(groups, groupBy);

    expect(sorted[0].key).toBe('Large');
    expect(sorted[1].key).toBe('Small');
  });

  it('defaults to label_asc when groupSort is not specified', () => {
    const groups = [makeGroup('Zulu', 1), makeGroup('Alpha', 1)];
    const groupBy: GroupByFieldRef[] = [{ source: 'role', fieldKey: 'role', label: 'Role' }];

    const sorted = sortGroups(groups, groupBy);

    expect(sorted[0].key).toBe('Alpha');
  });

  it('applies hierarchical sort for multi-level keys', () => {
    // Primary level: 9AM vs 12NN (time_asc)
    // Secondary level: within same primary, alpha_asc
    const groups = [
      makeGroup('12NN|||Beta', 1),
      makeGroup('9AM|||Zulu', 1),
      makeGroup('9AM|||Alpha', 1),
    ];
    const groupBy: GroupByFieldRef[] = [
      { source: 'registration', fieldKey: 'service', label: 'Service', groupSort: 'time_asc' },
      { source: 'role', fieldKey: 'role', label: 'Role', groupSort: 'label_asc' },
    ];

    const sorted = sortGroups(groups, groupBy);

    expect(sorted.map((g) => g.key)).toEqual(['9AM|||Alpha', '9AM|||Zulu', '12NN|||Beta']);
  });

  it('falls back to label comparison when all level comparisons are equal', () => {
    const groups = [makeGroup('b-key', 2), makeGroup('a-key', 2)];
    const groupBy: GroupByFieldRef[] = [];

    const sorted = sortGroups(groups, groupBy);

    expect(sorted[0].key).toBe('a-key');
  });
});
