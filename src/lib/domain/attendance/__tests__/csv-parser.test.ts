import { describe, expect, it } from 'vitest';

import {
  buildBulkAttendanceCsvRowsSchema,
  buildBulkAttendanceRowsFromCsv,
  parseCsvText,
} from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';

const TEST_FIELDS: AttendanceField[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    field_key: 'table_number',
    label: 'Table Number',
    field_type: 'number',
    is_required: true,
    is_active: true,
    display_order: 0,
    options: [],
    validation_rules: { min: 1 },
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    field_key: 'team_color',
    label: 'Team Color',
    field_type: 'select',
    is_required: false,
    is_active: true,
    display_order: 1,
    options: [
      { label: 'Red', value: 'red' },
      { label: 'Blue', value: 'blue' },
    ],
    validation_rules: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    field_key: 'checked',
    label: 'Checked',
    field_type: 'boolean',
    is_required: false,
    is_active: true,
    display_order: 2,
    options: [],
    validation_rules: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    field_key: 'tags',
    label: 'Tags',
    field_type: 'multi_select',
    is_required: false,
    is_active: true,
    display_order: 3,
    options: [
      { label: 'A', value: 'A' },
      { label: 'B', value: 'B' },
    ],
    validation_rules: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    event_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    field_key: 'toggles',
    label: 'Toggles',
    field_type: 'multi_select_toggle',
    is_required: false,
    is_active: true,
    display_order: 4,
    options: [
      { label: 'X', value: 'X' },
      { label: 'Y', value: 'Y' },
    ],
    validation_rules: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
];

describe('attendance csv parser', () => {
  it('fails when the CSV file is empty', () => {
    const parsed = parseCsvText('   ');
    expect(parsed.success).toBe(false);

    if (parsed.success) return;
    expect(parsed.error).toBe('CSV file is empty.');
  });

  it('parses valid CSV text and builds typed bulk rows', () => {
    const csv = [
      'attendee_kind,registration_id,public_registration_id,table_number,team_color',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,12,red',
    ].join('\n');

    const parsed = parseCsvText(csv);
    expect(parsed.success).toBe(true);

    if (!parsed.success) return;

    const built = buildBulkAttendanceRowsFromCsv(parsed.data.rows, TEST_FIELDS);
    expect(built.errors).toEqual([]);
    expect(built.rows).toHaveLength(1);

    const validated = buildBulkAttendanceCsvRowsSchema(TEST_FIELDS).safeParse(built.rows);
    expect(validated.success).toBe(true);
  });

  it('fails when required headers are missing', () => {
    const csv = ['registration_id,table_number', 'abc,12'].join('\n');

    const parsed = parseCsvText(csv);
    expect(parsed.success).toBe(false);

    if (parsed.success) return;
    expect(parsed.error).toContain('missing required header');
  });

  it('fails when the CSV only contains a header row', () => {
    const csv = 'attendee_kind,registration_id,public_registration_id,table_number';

    const parsed = parseCsvText(csv);
    expect(parsed.success).toBe(false);

    if (parsed.success) return;
    expect(parsed.error).toBe('CSV must include one header row and at least one data row.');
  });

  it('fails when a data row has the wrong number of columns', () => {
    const csv = [
      'attendee_kind,registration_id,public_registration_id,table_number',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,12,extra',
    ].join('\n');

    const parsed = parseCsvText(csv);
    expect(parsed.success).toBe(false);

    if (parsed.success) return;
    expect(parsed.error).toContain('expected 4');
  });

  it('parses CRLF files and ignores empty rows', () => {
    const csv =
      'attendee_kind,registration_id,public_registration_id,table_number\r\n\r\nregistered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,12\r\n';

    const parsed = parseCsvText(csv);
    expect(parsed.success).toBe(true);

    if (!parsed.success) return;
    expect(parsed.data.rows).toHaveLength(1);
    expect(parsed.data.rows[0]?.table_number).toBe('12');
  });

  it('parses escaped quotes inside csv cells', () => {
    const csv = [
      'attendee_kind,registration_id,public_registration_id,full_name,table_number',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,"Doe ""Johnny""",12',
    ].join('\n');

    const parsed = parseCsvText(csv);
    expect(parsed.success).toBe(true);

    if (!parsed.success) return;
    expect(parsed.data.rows[0]?.full_name).toBe('Doe "Johnny"');
  });

  it('parses boolean, multi-select, and multi-select-toggle values from CSV rows', () => {
    const built = buildBulkAttendanceRowsFromCsv(
      [
        {
          attendee_kind: 'registered',
          registration_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          public_registration_id: '',
          checked: 'true',
          tags: 'A|B',
          toggles: 'X:true|Y:false',
        },
      ],
      TEST_FIELDS,
    );

    expect(built.errors).toEqual([]);
    expect(built.rows[0]).toEqual(
      expect.objectContaining({
        answers: expect.objectContaining({
          checked: true,
          tags: ['A', 'B'],
          toggles: { X: true, Y: false },
        }),
      }),
    );
  });

  it('preserves unsupported boolean and toggle text values for downstream validation', () => {
    const built = buildBulkAttendanceRowsFromCsv(
      [
        {
          attendee_kind: 'registered',
          registration_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          public_registration_id: '',
          checked: 'maybe',
          toggles: 'X:maybe',
        },
      ],
      TEST_FIELDS,
    );

    expect(built.errors).toEqual([]);
    expect(built.rows[0]).toEqual(
      expect.objectContaining({
        answers: expect.objectContaining({
          checked: 'maybe',
          toggles: 'X:maybe',
        }),
      }),
    );
  });

  it('preserves toggle text without key-value separators for downstream validation', () => {
    const built = buildBulkAttendanceRowsFromCsv(
      [
        {
          attendee_kind: 'registered',
          registration_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          public_registration_id: '',
          toggles: 'Xtrue',
        },
      ],
      TEST_FIELDS,
    );

    expect(built.errors).toEqual([]);
    expect(built.rows[0]).toEqual(
      expect.objectContaining({
        answers: expect.objectContaining({
          toggles: 'Xtrue',
        }),
      }),
    );
  });

  it('keeps non-numeric number values as raw strings for downstream validation', () => {
    const built = buildBulkAttendanceRowsFromCsv(
      [
        {
          attendee_kind: 'registered',
          registration_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          public_registration_id: '',
          table_number: 'abc',
        },
      ],
      TEST_FIELDS,
    );

    expect(built.errors).toEqual([]);
    expect(built.rows[0]).toEqual(
      expect.objectContaining({
        answers: expect.objectContaining({
          table_number: 'abc',
        }),
      }),
    );
  });

  it('parses exported csv rows that contain quoted commas and multiline field values', () => {
    const csv = [
      'attendee_kind,registration_id,public_registration_id,member_id,full_name,email,role,category,table_number,team_color',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,MID-001,"Doe, Jane",jane@example.com,Staff,Adults,12,red',
      'public,,bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb,,"Guest Person",guest@example.com,,,"34\n35",blue',
    ].join('\n');

    const parsed = parseCsvText(csv);
    expect(parsed.success).toBe(true);

    if (!parsed.success) return;

    expect(parsed.data.rows).toHaveLength(2);
    expect(parsed.data.rows[0]?.full_name).toBe('Doe, Jane');
    expect(parsed.data.rows[0]?.role).toBe('Staff');
    expect(parsed.data.rows[0]?.category).toBe('Adults');
    expect(parsed.data.rows[1]?.table_number).toBe('34\n35');

    const built = buildBulkAttendanceRowsFromCsv(parsed.data.rows, TEST_FIELDS);
    expect(built.errors).toEqual([]);
    expect(built.rows).toHaveLength(2);
    expect(built.rows[0]?.answers).toEqual(
      expect.objectContaining({
        table_number: 12,
        team_color: 'red',
      }),
    );
  });

  it('allows blank values for required attendance fields in bulk CSV rows', () => {
    const csv = [
      'attendee_kind,registration_id,public_registration_id,table_number,team_color',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,,red',
    ].join('\n');

    const parsed = parseCsvText(csv);
    expect(parsed.success).toBe(true);

    if (!parsed.success) return;

    const built = buildBulkAttendanceRowsFromCsv(parsed.data.rows, TEST_FIELDS);
    expect(built.errors).toEqual([]);

    const validated = buildBulkAttendanceCsvRowsSchema(TEST_FIELDS).safeParse(built.rows);
    expect(validated.success).toBe(true);
  });

  it('reports row-level attendee reference validation failures', () => {
    const built = buildBulkAttendanceRowsFromCsv(
      [
        {
          attendee_kind: 'registered',
          registration_id: '',
          public_registration_id: '',
          table_number: '12',
        },
        {
          attendee_kind: 'public',
          registration_id: '',
          public_registration_id: '',
          table_number: '13',
        },
      ],
      TEST_FIELDS,
    );

    expect(built.rows).toHaveLength(0);
    expect(built.errors).toEqual([
      'Row 2: registration_id is required for registered attendees.',
      'Row 3: public_registration_id is required for public attendees.',
    ]);
  });

  it('builds valid public attendee rows', () => {
    const built = buildBulkAttendanceRowsFromCsv(
      [
        {
          attendee_kind: 'public',
          registration_id: '',
          public_registration_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          table_number: '14',
        },
      ],
      TEST_FIELDS,
    );

    expect(built.errors).toEqual([]);
    expect(built.rows[0]).toEqual(
      expect.objectContaining({
        attendee_kind: 'public',
        registration_id: undefined,
        public_registration_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      }),
    );
  });

  it('reports invalid attendee kinds as row-level errors', () => {
    const built = buildBulkAttendanceRowsFromCsv(
      [
        {
          attendee_kind: 'guest',
          registration_id: '',
          public_registration_id: '',
          table_number: '12',
        },
      ],
      TEST_FIELDS,
    );

    expect(built.rows).toHaveLength(0);
    expect(built.errors).toEqual(['Row 2: attendee_kind must be either registered or public.']);
  });

  it('falls back to empty strings when key columns are missing from row objects', () => {
    const built = buildBulkAttendanceRowsFromCsv([{}], TEST_FIELDS);

    expect(built.rows).toHaveLength(0);
    expect(built.errors).toEqual(['Row 2: attendee_kind must be either registered or public.']);
  });

  it('ignores legacy zero upper-bound validation rules during bulk CSV validation', () => {
    const csv = [
      'attendee_kind,registration_id,public_registration_id,table_number,team_color',
      'registered,aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa,,12,red',
    ].join('\n');

    const parsed = parseCsvText(csv);
    expect(parsed.success).toBe(true);

    if (!parsed.success) return;

    const built = buildBulkAttendanceRowsFromCsv(parsed.data.rows, [
      {
        ...TEST_FIELDS[0],
        validation_rules: { max: 0 },
      },
      {
        ...TEST_FIELDS[1],
        field_key: 'team_color',
        label: 'Team Color',
        validation_rules: { max_length: 0 },
      },
    ]);

    const validated = buildBulkAttendanceCsvRowsSchema([
      {
        ...TEST_FIELDS[0],
        validation_rules: { max: 0 },
      },
      {
        ...TEST_FIELDS[1],
        validation_rules: { max_length: 0 },
      },
    ]).safeParse(built.rows);

    expect(validated.success).toBe(true);
  });
});
