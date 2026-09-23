import { describe, expect, it } from 'vitest';

import type { AdminEventField, EventFieldType } from '@/lib/domain/event-fields';

import { buildBulkRegistrationCsvRowsSchema } from '../schemas';

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

describe('buildBulkRegistrationCsvRowsSchema', () => {
  it('validates a valid array of CSV rows', () => {
    const fields = [makeField('age', 'number'), makeField('notes', 'text')];

    const schema = buildBulkRegistrationCsvRowsSchema(fields);

    const validData = [
      {
        member_id: 'M-1',
        answers: {
          age: 30,
          notes: 'test note',
        },
      },
      {
        member_id: 'M-2',
        registration_id: 'reg-1',
        answers: {
          age: 40,
        },
      },
    ];

    const result = schema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects rows where member_id is missing or empty', () => {
    const fields = [makeField('age', 'number')];

    const schema = buildBulkRegistrationCsvRowsSchema(fields);

    const missingIdResult = schema.safeParse([{ answers: { age: 30 } }]);
    expect(missingIdResult.success).toBe(false);

    const emptyIdResult = schema.safeParse([{ member_id: '  ', answers: { age: 30 } }]);
    expect(emptyIdResult.success).toBe(false);
    if (!emptyIdResult.success) {
      expect(emptyIdResult.error.issues[0].message).toBe('member_id is required');
    }
  });

  it('rejects an empty array with the correct error message', () => {
    const fields = [makeField('age', 'number')];

    const schema = buildBulkRegistrationCsvRowsSchema(fields);

    const result = schema.safeParse([]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'At least one CSV row is required for bulk upload.',
      );
    }
  });

  it('rejects when answers do not match the dynamic field schema', () => {
    const fields = [makeField('age', 'number')];

    const schema = buildBulkRegistrationCsvRowsSchema(fields);

    const reallyInvalidAnswerTypeResult = schema.safeParse([
      {
        member_id: 'M-1',
        answers: {
          age: { invalid: true },
        },
      },
    ]);

    expect(reallyInvalidAnswerTypeResult.success).toBe(false);
  });

  it('allows optional fields by ignoring missing answers or mapping them correctly', () => {
    const fields = [
      makeField('age', 'number', { is_required: true }), // the function forces all to be optional for CSV
      makeField('notes', 'text', { is_required: true }),
    ];

    const schema = buildBulkRegistrationCsvRowsSchema(fields);

    const partialData = [
      {
        member_id: 'M-1',
        answers: {},
      },
    ];

    const result = schema.safeParse(partialData);
    expect(result.success).toBe(true);
  });
});
