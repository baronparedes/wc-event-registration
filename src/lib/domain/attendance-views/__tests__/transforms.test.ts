import { describe, expect, it, vi } from 'vitest';

import type { AttendeeSearchResult } from '@/lib/domain/attendance';

import {
  type AttendeeViewConfig,
  type DynamicFieldRef,
  buildAttendeeView,
  collectDynamicFieldOptions,
  fromDynamicFieldToken,
  toDynamicFieldToken,
} from '../index';

function makeAttendee(overrides: Partial<AttendeeSearchResult>): AttendeeSearchResult {
  return {
    attendee_kind: 'registered',
    registration_id: 'reg-1',
    public_registration_id: null,
    user_id: 'user-1',
    member_id: 'M-001',
    full_name: 'Alpha Member',
    email: 'alpha@example.com',
    role: 'Member',
    category: 'Adult',
    registration_status: 'submitted',
    submitted_at: '2026-07-18T10:00:00.000Z',
    check_in_status: 'not_checked_in',
    official_check_in_time: null,
    registration_answers: [],
    attendance_answers: [],
    ...overrides,
  };
}

function findField(
  fields: ReturnType<typeof collectDynamicFieldOptions>,
  source: DynamicFieldRef['source'],
  fieldKey: string,
): DynamicFieldRef {
  const field = fields.find((item) => item.source === source && item.fieldKey === fieldKey);
  if (!field) {
    throw new Error(`Missing dynamic field ${source}:${fieldKey}`);
  }
  return field;
}

const defaultViewConfig: AttendeeViewConfig = {
  nameOrMemberQuery: '',
  role: [],
  category: 'all',
  checkInStatus: 'all',
  dynamicFilters: [],
  groupBy: [],
  visibleFields: [],
};

describe('attendance-views transforms', () => {
  it('collects dynamic field options and values from registration and attendance answers', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_answers: [
          {
            event_field_id: 'event-field-service',
            field_type: 'select',
            field_key: 'service',
            label: 'Service',
            answer_text: '9AM',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'attendance-field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'North',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        full_name: 'Beta Member',
        registration_answers: [
          {
            event_field_id: 'event-field-service',
            field_type: 'select',
            field_key: 'service',
            label: 'Service',
            answer_text: '12NN',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'attendance-field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'South',
            answer_number: null,
          },
        ],
      }),
    ];

    const options = collectDynamicFieldOptions(attendees);
    const service = options.find(
      (item) => item.source === 'registration' && item.fieldKey === 'service',
    );
    const area = options.find((item) => item.source === 'attendance' && item.fieldKey === 'area');

    expect(service?.values).toEqual(['12NN', '9AM']);
    expect(area?.values).toEqual(['North', 'South']);
  });

  it('filters attendees by role and dynamic field value', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        role: 'Member',
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'North',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        role: 'Volunteer',
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'North',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const areaField = findField(fields, 'attendance', 'area');

    const result = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      role: ['member'],
      dynamicFilters: [{ field: areaField, value: 'North' }],
    });

    expect(result.filteredAttendees).toHaveLength(1);
    expect(result.filteredAttendees[0].registration_id).toBe('reg-1');
  });

  it('excludes attendees without role when role filters are applied', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        role: null,
      }),
      makeAttendee({
        registration_id: 'reg-2',
        role: 'Member',
      }),
    ];

    const result = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      role: ['member'],
    });

    expect(result.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual(['reg-2']);
  });

  it('filters attendees by name or member ID query', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        full_name: 'Alice Santos',
        member_id: 'MID-100',
      }),
      makeAttendee({
        registration_id: 'reg-2',
        full_name: 'Bob Reyes',
        member_id: 'MID-200',
      }),
    ];

    const byName = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      nameOrMemberQuery: 'alice',
    });
    expect(byName.filteredAttendees).toHaveLength(1);
    expect(byName.filteredAttendees[0].registration_id).toBe('reg-1');

    const byMemberId = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      nameOrMemberQuery: 'mid-200',
    });
    expect(byMemberId.filteredAttendees).toHaveLength(1);
    expect(byMemberId.filteredAttendees[0].registration_id).toBe('reg-2');
  });

  it('supports relative date literal filters for date and datetime fields', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-19T12:00:00.000Z'));

    try {
      const attendees: AttendeeSearchResult[] = [
        makeAttendee({
          registration_id: 'reg-1',
          full_name: 'Sunday Member',
          registration_answers: [
            {
              event_field_id: 'event-field-service-date',
              field_type: 'date',
              field_key: 'service_date',
              label: 'Service Date',
              answer_text: '2026-07-19',
              answer_number: null,
            },
          ],
        }),
        makeAttendee({
          registration_id: 'reg-2',
          full_name: 'Previous Week Member',
          registration_answers: [
            {
              event_field_id: 'event-field-service-date',
              field_type: 'date',
              field_key: 'service_date',
              label: 'Service Date',
              answer_text: '2026-07-05',
              answer_number: null,
            },
          ],
        }),
        makeAttendee({
          registration_id: 'reg-3',
          full_name: 'Previous Month Member',
          registration_answers: [
            {
              event_field_id: 'event-field-service-date',
              field_type: 'date',
              field_key: 'service_date',
              label: 'Service Date',
              answer_text: '2026-06-01',
              answer_number: null,
            },
          ],
        }),
        makeAttendee({
          registration_id: 'reg-4',
          full_name: 'Different Year Member',
          registration_answers: [
            {
              event_field_id: 'event-field-service-date',
              field_type: 'date',
              field_key: 'service_date',
              label: 'Service Date',
              answer_text: '2025-07-19',
              answer_number: null,
            },
          ],
        }),
        makeAttendee({
          registration_id: 'reg-5',
          full_name: 'DateTime Member',
          registration_answers: [
            {
              event_field_id: 'event-field-check-in-time',
              field_type: 'datetime',
              field_key: 'check_in_time',
              label: 'Check-in Time',
              answer_text: '2026-07-19T08:30:00.000Z',
              answer_number: null,
            },
          ],
        }),
      ];

      const fields = collectDynamicFieldOptions(attendees);
      const serviceDateField = findField(fields, 'registration', 'service_date');
      const checkInTimeField = findField(fields, 'registration', 'check_in_time');

      const upcomingSunday = buildAttendeeView(attendees, {
        ...defaultViewConfig,
        dynamicFilters: [{ field: serviceDateField, value: 'UPCOMING_SUNDAY' }],
      });
      expect(upcomingSunday.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
        'reg-1',
      ]);

      const july = buildAttendeeView(attendees, {
        ...defaultViewConfig,
        dynamicFilters: [{ field: serviceDateField, value: 'MONTH_JULY' }],
      });
      expect(july.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
        'reg-1',
        'reg-2',
        'reg-4',
      ]);

      const year2026 = buildAttendeeView(attendees, {
        ...defaultViewConfig,
        dynamicFilters: [{ field: serviceDateField, value: 'YEAR_2026' }],
      });
      expect(year2026.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
        'reg-1',
        'reg-2',
        'reg-3',
      ]);

      const yearMonth2026July = buildAttendeeView(attendees, {
        ...defaultViewConfig,
        dynamicFilters: [{ field: serviceDateField, value: 'YEAR_MONTH_2026_JULY' }],
      });
      expect(
        yearMonth2026July.filteredAttendees.map((attendee) => attendee.registration_id),
      ).toEqual(['reg-1', 'reg-2']);

      const previous3Weeks = buildAttendeeView(attendees, {
        ...defaultViewConfig,
        dynamicFilters: [{ field: serviceDateField, value: 'PREVIOUS_3_WEEKS' }],
      });
      expect(previous3Weeks.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
        'reg-1',
        'reg-2',
      ]);

      const datetimeRelative = buildAttendeeView(attendees, {
        ...defaultViewConfig,
        dynamicFilters: [{ field: checkInTimeField, value: 'UPCOMING_SUNDAY' }],
      });
      expect(
        datetimeRelative.filteredAttendees.map((attendee) => attendee.registration_id),
      ).toEqual(['reg-5']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('groups attendees by multiple dynamic fields in ordered levels', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        full_name: 'Alpha Member',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'select',
            field_key: 'service',
            label: 'Service',
            answer_text: '9AM',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'North',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        full_name: 'Beta Member',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'select',
            field_key: 'service',
            label: 'Service',
            answer_text: '9AM',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'South',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const primary = findField(fields, 'attendance', 'area');
    const secondary = findField(fields, 'registration', 'service');

    const result = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      groupBy: [primary, secondary],
    });

    const labels = result.groups.map((group) => group.label);
    const keys = result.groups.map((group) => group.key);

    expect(labels).toEqual(['North / 9AM', 'South / 9AM']);
    expect(keys).toEqual([`${'North'}|||${'9AM'}`, `${'South'}|||${'9AM'}`]);
    expect(toDynamicFieldToken(primary)).toBe('attendance:area');
  });

  it('includes seeded fields even when attendees have no answers yet', () => {
    const attendees: AttendeeSearchResult[] = [makeAttendee({})];

    const options = collectDynamicFieldOptions(attendees, [
      { source: 'registration', fieldKey: 'service', label: 'Service' },
      { source: 'attendance', fieldKey: 'area', label: 'Area' },
    ]);

    expect(options).toEqual([
      {
        source: 'registration',
        fieldKey: 'service',
        label: 'Service',
        token: 'registration:service',
        values: [],
      },
      {
        source: 'attendance',
        fieldKey: 'area',
        label: 'Area',
        token: 'attendance:area',
        values: [],
      },
    ]);

    expect(fromDynamicFieldToken('registration:service', options)).toMatchObject({
      source: 'registration',
      fieldKey: 'service',
    });
    expect(fromDynamicFieldToken('registration:missing', options)).toBeNull();
  });

  it('sorts same-source seeded fields by label when sort order is not provided', () => {
    const options = collectDynamicFieldOptions(
      [],
      [
        { source: 'registration', fieldKey: 'zeta', label: 'Zeta' },
        { source: 'registration', fieldKey: 'alpha', label: 'Alpha' },
      ],
    );

    expect(options.map((field) => field.label)).toEqual(['Alpha', 'Zeta']);
  });

  it('handles numeric and empty answer values when collecting options and filtering', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'event-field-rank',
            field_type: 'number',
            field_key: 'rank',
            label: 'Rank',
            answer_text: null,
            answer_number: 7,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'attendance-field-area',
            field_type: 'text',
            field_key: 'area',
            label: 'Area',
            answer_text: null,
            answer_number: null,
          },
        ],
      }),
    ];

    const options = collectDynamicFieldOptions(attendees);
    const rank = options.find(
      (field) => field.source === 'registration' && field.fieldKey === 'rank',
    );
    const area = options.find(
      (field) => field.source === 'attendance' && field.fieldKey === 'area',
    );

    expect(rank?.values).toEqual(['7']);
    expect(area?.values).toEqual([]);

    const rankField = findField(options, 'registration', 'rank');
    const filtered = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: rankField, value: '7' }],
    });

    expect(filtered.filteredAttendees).toHaveLength(1);
  });

  it('applies category/check-in filters and keeps grouped registrants sorted by full name', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        full_name: 'Zulu Member',
        category: 'Adult',
        check_in_status: 'checked_in',
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'North',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        full_name: 'Alpha Member',
        category: 'Adult',
        check_in_status: 'checked_in',
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'North',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-3',
        full_name: 'Filtered Member',
        category: 'Youth',
        check_in_status: 'not_checked_in',
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'North',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const areaField = findField(fields, 'attendance', 'area');

    const result = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      category: 'Adult',
      checkInStatus: 'checked_in',
      groupBy: [areaField],
    });

    expect(result.filteredAttendees.map((item) => item.registration_id)).toEqual([
      'reg-1',
      'reg-2',
    ]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].key).toBe('North');
    expect(result.groups[0].registrants.map((item) => item.full_name)).toEqual([
      'Alpha Member',
      'Zulu Member',
    ]);
  });

  it('collects individual options from multi-select answers and filters by contained value', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        full_name: 'Alpha Member',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '["ushering","prayer","backroom"]',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        full_name: 'Beta Member',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '["music"]',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const service = fields.find(
      (item) => item.source === 'registration' && item.fieldKey === 'service',
    );
    expect(service?.values).toEqual(['backroom', 'music', 'prayer', 'ushering']);

    const serviceField = findField(fields, 'registration', 'service');
    const filtered = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: serviceField, value: 'prayer' }],
    });

    expect(filtered.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
      'reg-1',
    ]);
  });

  it('fans out multi-select grouping into separate subgroup buckets', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        full_name: 'Alpha Member',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '["ushering","prayer","backroom"]',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        full_name: 'Beta Member',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '["prayer","backroom","ushering"]',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const serviceField = findField(fields, 'registration', 'service');
    const grouped = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      groupBy: [serviceField],
    });

    expect(grouped.groups.map((group) => group.label)).toEqual(['backroom', 'prayer', 'ushering']);
    expect(
      grouped.groups.map((group) => group.registrants.map((item) => item.registration_id)),
    ).toEqual([
      ['reg-1', 'reg-2'],
      ['reg-1', 'reg-2'],
      ['reg-1', 'reg-2'],
    ]);
  });

  it('shows only matching subgroup when filtering and grouping on the same multi-select field', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        full_name: 'Alpha Member',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '["ushering","prayer","backroom"]',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        full_name: 'Beta Member',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '["prayer","backroom","ushering"]',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const serviceField = findField(fields, 'registration', 'service');
    const grouped = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: serviceField, value: 'prayer' }],
      groupBy: [serviceField],
    });

    expect(grouped.groups.map((group) => group.label)).toEqual(['prayer']);
    expect(
      grouped.groups.map((group) => group.registrants.map((item) => item.registration_id)),
    ).toEqual([['reg-1', 'reg-2']]);
  });

  it('treats same-field dynamic filters as OR while keeping different fields as AND', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        role: 'Member',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '["ushering"]',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        role: 'Member',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '["prayer"]',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-3',
        role: 'Volunteer',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '["prayer"]',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const serviceField = findField(fields, 'registration', 'service');

    const result = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      role: ['Member'],
      dynamicFilters: [
        { field: serviceField, value: 'ushering' },
        { field: serviceField, value: 'prayer' },
      ],
    });

    expect(result.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
      'reg-1',
      'reg-2',
    ]);
  });

  it('supports OR matching across different fields when dynamicFilterCombination is set to or', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'select',
            field_key: 'service',
            label: 'Service',
            answer_text: '9AM',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'West',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'select',
            field_key: 'service',
            label: 'Service',
            answer_text: '12NN',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'North',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-3',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'select',
            field_key: 'service',
            label: 'Service',
            answer_text: '7AM',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'South',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const serviceField = findField(fields, 'registration', 'service');
    const areaField = findField(fields, 'attendance', 'area');

    const result = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilterCombination: 'or',
      dynamicFilters: [
        { field: serviceField, value: '9AM' },
        { field: areaField, value: 'North' },
      ],
    });

    expect(result.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
      'reg-1',
      'reg-2',
    ]);
  });

  it('matches multi-select-toggle filters when the key exists regardless of toggle boolean', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"12NN":true,"3PM":true,"9AM":true}',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"12NN":false,"9AM":true}',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const slotField = findField(fields, 'registration', 'slot_choice');

    const keyExistsMatch = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [
        {
          field: slotField,
          value: '12NN',
        },
      ],
    });

    const missingKeyMatch = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [
        {
          field: slotField,
          value: '6PM',
        },
      ],
    });

    expect(keyExistsMatch.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
      'reg-1',
      'reg-2',
    ]);
    expect(missingKeyMatch.filteredAttendees).toHaveLength(0);
  });

  it('supports multi-select-toggle key boolean filters (key, key=true, key=false)', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"9AM":true,"12NN":false}',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"9AM":false,"12NN":true}',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-3',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"12NN":true}',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const slotField = findField(fields, 'registration', 'slot_choice');

    const byKeyOnly = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: slotField, value: '9AM' }],
    });

    const byTrue = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: slotField, value: '9AM=true' }],
    });

    const byFalse = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: slotField, value: '9AM=false' }],
    });

    expect(byKeyOnly.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
      'reg-1',
      'reg-2',
    ]);
    expect(byTrue.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual(['reg-1']);
    expect(byFalse.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
      'reg-2',
    ]);
  });

  it('rejects invalid multi-select-toggle equals syntax with empty key', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"9AM":true}',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const slotField = findField(fields, 'registration', 'slot_choice');
    const invalidFilterResult = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: slotField, value: '=true' }],
    });

    expect(invalidFilterResult.filteredAttendees).toHaveLength(0);
  });

  it('drops attendees with missing static group values when grouping by role/category', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        role: 'Member',
        category: 'Adult',
      }),
      makeAttendee({
        registration_id: 'reg-2',
        role: null,
        category: 'Adult',
      }),
      makeAttendee({
        registration_id: 'reg-3',
        role: 'Member',
        category: null,
      }),
    ];

    const groupedByRole = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      groupBy: [{ source: 'role', fieldKey: 'role', label: 'Role' }],
    });

    const groupedByCategory = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      groupBy: [{ source: 'category', fieldKey: 'category', label: 'Category' }],
    });

    expect(
      groupedByRole.groups.map((group) => group.registrants.map((item) => item.registration_id)),
    ).toEqual([['reg-1', 'reg-3']]);
    expect(
      groupedByCategory.groups.map((group) =>
        group.registrants.map((item) => item.registration_id),
      ),
    ).toEqual([['reg-1', 'reg-2']]);
  });

  it('does not treat key=true syntax specially for non-multi-select-toggle fields', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '["9AM"]',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const serviceField = findField(fields, 'registration', 'service');

    const exactValueMatch = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: serviceField, value: '9AM' }],
    });

    const equalsSyntaxShouldNotMatch = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: serviceField, value: '9AM=true' }],
    });

    expect(exactValueMatch.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual([
      'reg-1',
    ]);
    expect(equalsSyntaxShouldNotMatch.filteredAttendees).toHaveLength(0);
  });

  it('fans out multi-select-toggle grouping into true-key subgroup buckets', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"12NN":true,"3PM":true,"9AM":true}',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"12NN":true,"9AM":true}',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const slotField = findField(fields, 'registration', 'slot_choice');
    const grouped = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      groupBy: [slotField],
    });

    expect(grouped.groups.map((group) => group.label)).toEqual(['12NN', '3PM', '9AM']);
    expect(
      grouped.groups.map((group) => group.registrants.map((item) => item.registration_id)),
    ).toEqual([['reg-1', 'reg-2'], ['reg-1'], ['reg-1', 'reg-2']]);
  });

  it('sorts service-like time groups chronologically when groupSort is time_asc', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"12NN":true,"3PM":true,"9AM":true}',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const slotField = findField(fields, 'registration', 'slot_choice');
    const grouped = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      groupBy: [{ ...slotField, groupSort: 'time_asc' }],
    });

    expect(grouped.groups.map((group) => group.label)).toEqual(['9AM', '12NN', '3PM']);
  });

  it('sorts actual date-time group labels chronologically when groupSort is time_asc', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'service_datetime',
            label: 'Service DateTime',
            answer_text:
              '{"2026-07-27 12:00 PM":true,"2026-07-27 3:00 PM":true,"2026-07-27 9:00 AM":true}',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const slotField = findField(fields, 'registration', 'service_datetime');
    const grouped = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      groupBy: [{ ...slotField, groupSort: 'time_asc' }],
    });

    expect(grouped.groups.map((group) => group.label)).toEqual([
      '2026-07-27 9:00 AM',
      '2026-07-27 12:00 PM',
      '2026-07-27 3:00 PM',
    ]);
  });

  it('handles malformed and duplicate dynamic answer payloads without producing invalid filter values', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: null,
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slot Choice',
            answer_text: null,
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '{"not":"array"}',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slot Choice',
            answer_text: '["bad"]',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-3',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '[" Choir ","",1,"choir","Ushering"]',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slot Choice',
            answer_text: '{" 9AM ":true,"9am":true,"12NN":false}',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-4',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '{"bad"',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slot Choice',
            answer_text: '{"bad"',
            answer_number: null,
          },
        ],
      }),
    ];

    const options = collectDynamicFieldOptions(attendees);
    const serviceField = options.find(
      (field) => field.source === 'registration' && field.fieldKey === 'service',
    );
    const slotField = options.find(
      (field) => field.source === 'attendance' && field.fieldKey === 'slot_choice',
    );

    expect(serviceField?.values).toEqual(['Choir', 'Ushering']);
    expect(slotField?.values).toEqual(['12NN', '9AM']);
  });

  it('returns no matches for missing or empty dynamic filter values and check-in mismatches', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        check_in_status: 'checked_in',
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'text',
            field_key: 'area',
            label: 'Area',
            answer_text: null,
            answer_number: null,
          },
          {
            attendance_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '["bad-shape"]',
            answer_number: null,
          },
        ],
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'multi_select',
            field_key: 'service',
            label: 'Service',
            answer_text: '{"not":"array"}',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const areaField = findField(fields, 'attendance', 'area');
    const slotField = findField(fields, 'attendance', 'slot_choice');
    const serviceField = findField(fields, 'registration', 'service');

    const noAnswerMatch = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: { ...areaField, fieldKey: 'missing_area' }, value: 'North' }],
    });
    expect(noAnswerMatch.filteredAttendees).toHaveLength(0);

    const checkInMismatch = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      checkInStatus: 'not_checked_in',
    });
    expect(checkInMismatch.filteredAttendees).toHaveLength(0);

    const emptyTextValue = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: areaField, value: 'North' }],
    });
    expect(emptyTextValue.filteredAttendees).toHaveLength(0);

    const emptyMultiSelect = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: serviceField, value: 'ushering' }],
    });
    expect(emptyMultiSelect.filteredAttendees).toHaveLength(0);

    const emptyToggle = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: slotField, value: '9AM' }],
    });
    expect(emptyToggle.filteredAttendees).toHaveLength(0);
  });

  it('drops grouped rows when toggle filter matches a false key but grouping needs true keys', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"12NN":false}',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const slotField = findField(fields, 'registration', 'slot_choice');

    const grouped = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilters: [{ field: slotField, value: '12NN' }],
      groupBy: [slotField],
    });

    expect(grouped.filteredAttendees).toHaveLength(1);
    expect(grouped.groups).toEqual([{ key: 'all', label: 'All attendees', registrants: [] }]);
  });

  it('excludes malformed toggle grouping values while preserving valid deduped true-key groups', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: null,
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '["not-an-object"]',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-3',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{"bad"',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-4',
        registration_answers: [
          {
            event_field_id: 'field-slot',
            field_type: 'multi_select_toggle',
            field_key: 'slot_choice',
            label: 'Slots',
            answer_text: '{" 9AM ":true,"9am":true,"12NN":false}',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const slotField = findField(fields, 'registration', 'slot_choice');

    const grouped = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      groupBy: [slotField],
    });

    expect(grouped.filteredAttendees).toHaveLength(4);
    expect(grouped.groups.map((group) => group.label)).toEqual(['9AM']);
    expect(grouped.groups[0].registrants.map((item) => item.registration_id)).toEqual(['reg-4']);
  });

  it('excludes attendees from grouped output when the grouped field answer is missing', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        full_name: 'Has Area',
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'North',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        full_name: 'No Area',
        attendance_answers: [],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees, [
      { source: 'attendance', fieldKey: 'area', label: 'Area' },
    ]);
    const areaField = findField(fields, 'attendance', 'area');

    const grouped = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      groupBy: [areaField],
    });

    expect(grouped.filteredAttendees).toHaveLength(2);
    expect(grouped.groups).toHaveLength(1);
    expect(grouped.groups[0].label).toBe('North');
    expect(grouped.groups[0].registrants.map((item) => item.registration_id)).toEqual(['reg-1']);
  });

  it('supports nested dynamicFilterExpression with group and not operators', () => {
    const attendees: AttendeeSearchResult[] = [
      makeAttendee({
        registration_id: 'reg-1',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'select',
            field_key: 'service',
            label: 'Service',
            answer_text: '9AM',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'North',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-2',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'select',
            field_key: 'service',
            label: 'Service',
            answer_text: '9AM',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'West',
            answer_number: null,
          },
        ],
      }),
      makeAttendee({
        registration_id: 'reg-3',
        registration_answers: [
          {
            event_field_id: 'field-service',
            field_type: 'select',
            field_key: 'service',
            label: 'Service',
            answer_text: '12NN',
            answer_number: null,
          },
        ],
        attendance_answers: [
          {
            attendance_field_id: 'field-area',
            field_type: 'select',
            field_key: 'area',
            label: 'Area',
            answer_text: 'West',
            answer_number: null,
          },
        ],
      }),
    ];

    const fields = collectDynamicFieldOptions(attendees);
    const serviceField = findField(fields, 'registration', 'service');
    const areaField = findField(fields, 'attendance', 'area');

    const result = buildAttendeeView(attendees, {
      ...defaultViewConfig,
      dynamicFilterExpression: {
        type: 'group',
        op: 'and',
        children: [
          {
            type: 'condition',
            filter: { field: serviceField, value: '9AM' },
          },
          {
            type: 'not',
            child: {
              type: 'condition',
              filter: { field: areaField, value: 'North' },
            },
          },
        ],
      },
    });

    expect(result.filteredAttendees.map((attendee) => attendee.registration_id)).toEqual(['reg-2']);
  });
});
