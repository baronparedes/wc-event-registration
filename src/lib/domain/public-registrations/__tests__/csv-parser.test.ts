import { describe, expect, it } from 'vitest';

import type { AdminEventField, EventFieldType } from '@/lib/domain/event-fields';
import {
  buildBulkPublicRegistrationRowsFromCsv,
  parsePublicRegistrationCsvText,
} from '@/lib/domain/public-registrations/csv-parser';

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
    applicability: 'guests',
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

describe('parsePublicRegistrationCsvText', () => {
  it('rejects empty CSV text', () => {
    expect(parsePublicRegistrationCsvText('  ')).toEqual({
      success: false,
      error: 'CSV file is empty.',
    });
  });

  it('rejects CSV without a data row', () => {
    const result = parsePublicRegistrationCsvText('first_name,last_name,email');

    expect(result).toEqual({
      success: false,
      error: 'CSV must include one header row and at least one data row.',
    });
  });

  it('rejects CSV without required headers', () => {
    const result = parsePublicRegistrationCsvText('first_name,last_name\nJane,Doe');

    expect(result).toEqual({
      success: false,
      error: 'CSV is missing required header(s): email.',
    });
  });

  it('rejects unterminated quoted values', () => {
    const result = parsePublicRegistrationCsvText(
      'first_name,last_name,email,notes\nJane,Doe,jane@example.com,"needs seat',
    );

    expect(result).toEqual({
      success: false,
      error: 'Unterminated quoted value in CSV line.',
    });
  });

  it('rejects rows with a different number of columns', () => {
    const result = parsePublicRegistrationCsvText(
      'first_name,last_name,email\nJane,Doe,jane@example.com,extra',
    );

    expect(result).toEqual({
      success: false,
      error: 'Row 2 has 4 column(s); expected 3.',
    });
  });

  it('parses trimmed values, quoted commas, escaped quotes, and CRLF rows', () => {
    const result = parsePublicRegistrationCsvText(
      'first_name,last_name,email,notes\r\n Jane ,Doe,jane@example.com,"Bring lunch, please"\r\n',
    );

    expect(result).toEqual({
      success: true,
      data: {
        headers: ['first_name', 'last_name', 'email', 'notes'],
        rows: [
          {
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane@example.com',
            notes: 'Bring lunch, please',
          },
        ],
      },
    });
  });
});

describe('buildBulkPublicRegistrationRowsFromCsv', () => {
  it('builds typed answers and trims optional identifier columns', () => {
    const fields = [
      makeField('age', 'number'),
      makeField('is_ready', 'boolean'),
      makeField('needs_food', 'checkbox'),
      makeField('availability', 'multi_select'),
      makeField('preferences', 'multi_select_toggle'),
      makeField('notes', 'textarea'),
    ];

    const result = buildBulkPublicRegistrationRowsFromCsv(
      [
        {
          first_name: ' Jane ',
          last_name: ' Doe ',
          email: ' jane@example.com ',
          nickname: ' J ',
          phone: ' 09171234567 ',
          public_registration_id: ' reg-1 ',
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
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
          nickname: 'J',
          phone: '09171234567',
          public_registration_id: 'reg-1',
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

    const result = buildBulkPublicRegistrationRowsFromCsv(
      [
        {
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
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
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      nickname: undefined,
      phone: undefined,
      public_registration_id: undefined,
      answers: {
        age: 'not a number',
        is_ready: 'maybe',
        preferences: 'quiet maybe',
        notes: undefined,
      },
    });
  });

  it('returns errors for required attendee fields and continues with other rows', () => {
    const result = buildBulkPublicRegistrationRowsFromCsv(
      [
        { first_name: ' ', last_name: 'Doe', email: 'jane@example.com' },
        { first_name: 'Jane', last_name: ' ', email: 'jane@example.com' },
        { first_name: 'Jane', last_name: 'Doe', email: ' ' },
        { first_name: 'John', last_name: 'Smith', email: 'john@example.com', notes: 'Valid row' },
      ],
      [makeField('notes', 'text')],
    );

    expect(result.errors).toEqual([
      'Row 2: first_name is required.',
      'Row 3: last_name is required.',
      'Row 4: email is required.',
    ]);
    expect(result.rows).toEqual([
      {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john@example.com',
        nickname: undefined,
        phone: undefined,
        public_registration_id: undefined,
        answers: { notes: 'Valid row' },
      },
    ]);
  });

  it('includes only the requested field keys', () => {
    const result = buildBulkPublicRegistrationRowsFromCsv(
      [
        {
          first_name: 'Jane',
          last_name: 'Doe',
          email: 'jane@example.com',
          included: 'yes',
          excluded: 'no',
        },
      ],
      [makeField('included', 'text'), makeField('excluded', 'text')],
      ['included'],
    );

    expect(result.rows[0].answers).toEqual({ included: 'yes' });
  });

  it('falls back to raw value for invalid toggle pairs', () => {
    const field = makeField('preferences', 'multi_select_toggle');

    expect(
      buildBulkPublicRegistrationRowsFromCsv(
        [
          {
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane@example.com',
            preferences: ': true',
          },
        ],
        [field],
      ).rows[0].answers.preferences,
    ).toBe(': true');
    expect(
      buildBulkPublicRegistrationRowsFromCsv(
        [
          {
            first_name: 'Jane',
            last_name: 'Doe',
            email: 'jane@example.com',
            preferences: 'quiet: maybe',
          },
        ],
        [field],
      ).rows[0].answers.preferences,
    ).toBe('quiet: maybe');
  });
});
