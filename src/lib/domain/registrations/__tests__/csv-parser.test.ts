import { describe, expect, it } from 'vitest';

import type { AdminEventField, EventFieldType } from '@/lib/domain/event-fields';
import {
  buildBulkRegistrationRowsFromCsv,
  parseRegistrationCsvText,
} from '@/lib/domain/registrations/csv-parser';

function makeField(
  fieldKey: string,
  fieldType: EventFieldType,
  overrides: Partial<AdminEventField> = {},
): AdminEventField {
  return {
    id: `${fieldKey}-id`,
    event_id: 'event-1',
    field_key: fieldKey,
    label: fieldKey,
    field_type: fieldType,
    applicability: 'members',
    is_required: false,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: [],
    validation_rules: {},
    display_order: 0,
    created_at: '2026-08-14T00:00:00.000Z',
    updated_at: '2026-08-14T00:00:00.000Z',
    ...overrides,
  };
}

describe('parseRegistrationCsvText', () => {
  it('rejects empty CSV text', () => {
    expect(parseRegistrationCsvText('  ')).toEqual({
      success: false,
      error: 'CSV file is empty.',
    });
  });

  it('rejects CSV without a data row', () => {
    const result = parseRegistrationCsvText('member_id,team');

    expect(result).toEqual({
      success: false,
      error: 'CSV must include one header row and at least one data row.',
    });
  });

  it('rejects CSV without the required member_id header', () => {
    const result = parseRegistrationCsvText('team\nBlue');

    expect(result).toEqual({
      success: false,
      error: 'CSV is missing required header(s): member_id.',
    });
  });

  it('rejects unterminated quoted values', () => {
    const result = parseRegistrationCsvText('member_id,notes\nM-1,"needs a seat');

    expect(result).toEqual({
      success: false,
      error: 'Unterminated quoted value in CSV line.',
    });
  });

  it('rejects rows with a different number of columns', () => {
    const result = parseRegistrationCsvText('member_id,team\nM-1,Blue,Extra');

    expect(result).toEqual({
      success: false,
      error: 'Row 2 has 3 column(s); expected 2.',
    });
  });

  it('parses trimmed values, quoted commas, escaped quotes, and CRLF rows', () => {
    const result = parseRegistrationCsvText(
      'member_id,notes,team\r\n M-1 ,"Bring lunch, please","Jo""s team"\r\n',
    );

    expect(result).toEqual({
      success: true,
      data: {
        headers: ['member_id', 'notes', 'team'],
        rows: [
          {
            member_id: 'M-1',
            notes: 'Bring lunch, please',
            team: 'Jo"s team',
          },
        ],
      },
    });
  });
});

describe('buildBulkRegistrationRowsFromCsv', () => {
  it('builds typed answers and trims the registration ID', () => {
    const fields = [
      makeField('age', 'number'),
      makeField('is_ready', 'boolean'),
      makeField('needs_food', 'checkbox'),
      makeField('availability', 'multi_select'),
      makeField('preferences', 'multi_select_toggle'),
      makeField('notes', 'textarea'),
    ];

    const result = buildBulkRegistrationRowsFromCsv(
      [
        {
          member_id: ' M-1 ',
          registration_id: ' registration-1 ',
          age: ' 42 ',
          is_ready: 'YES',
          needs_food: '0',
          availability: 'Saturday | Sunday; Monday',
          preferences: 'quiet: true | front: no',
          notes: '  Bring a notebook  ',
        },
      ],
      fields,
    );

    expect(result).toEqual({
      errors: [],
      rows: [
        {
          member_id: 'M-1',
          registration_id: 'registration-1',
          answers: {
            age: 42,
            is_ready: true,
            needs_food: false,
            availability: ['Saturday', 'Sunday', 'Monday'],
            preferences: { quiet: true, front: false },
            notes: 'Bring a notebook',
          },
        },
      ],
    });
  });

  it('keeps invalid typed values as trimmed strings and empty values undefined', () => {
    const fields = [
      makeField('age', 'number'),
      makeField('is_ready', 'boolean'),
      makeField('preferences', 'multi_select_toggle'),
      makeField('notes', 'text'),
    ];

    const result = buildBulkRegistrationRowsFromCsv(
      [
        {
          member_id: 'M-1',
          age: 'not a number',
          is_ready: 'maybe',
          preferences: 'quiet maybe',
          notes: '   ',
        },
      ],
      fields,
    );

    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toEqual({
      member_id: 'M-1',
      registration_id: undefined,
      answers: {
        age: 'not a number',
        is_ready: 'maybe',
        preferences: 'quiet maybe',
        notes: undefined,
      },
    });
  });

  it('returns an error for missing member IDs and continues with other rows', () => {
    const result = buildBulkRegistrationRowsFromCsv(
      [{ member_id: '   ' }, { member_id: 'M-2', notes: 'Valid row' }],
      [makeField('notes', 'text')],
    );

    expect(result.errors).toEqual(['Row 2: member_id is required.']);
    expect(result.rows).toEqual([
      {
        member_id: 'M-2',
        registration_id: undefined,
        answers: { notes: 'Valid row' },
      },
    ]);
  });

  it('includes only the requested field keys', () => {
    const result = buildBulkRegistrationRowsFromCsv(
      [{ member_id: 'M-1', included: 'yes', excluded: 'no' }],
      [makeField('included', 'text'), makeField('excluded', 'text')],
      ['included'],
    );

    expect(result.rows[0].answers).toEqual({ included: 'yes' });
  });

  it('falls back to the raw value for invalid toggle pairs', () => {
    const field = makeField('preferences', 'multi_select_toggle');

    expect(
      buildBulkRegistrationRowsFromCsv([{ member_id: 'M-1', preferences: ': true' }], [field])
        .rows[0].answers.preferences,
    ).toBe(': true');
    expect(
      buildBulkRegistrationRowsFromCsv([{ member_id: 'M-1', preferences: 'quiet: maybe' }], [field])
        .rows[0].answers.preferences,
    ).toBe('quiet: maybe');
  });
});
