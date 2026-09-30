import { assertEquals } from '@std/assert';

import { type EventFieldRow, chunkArray, normalizeAnswer, requestSchema } from '../utils.ts';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';

function makeField(overrides: Partial<EventFieldRow> = {}): EventFieldRow {
  return {
    id: 'field-1',
    field_key: 'answer',
    label: 'Answer',
    field_type: 'text',
    is_required: false,
    options: null,
    validation_rules: null,
    ...overrides,
  };
}

Deno.test('bulk-upsert-registrations request schema requires event ID and at least one row', () => {
  assertEquals(requestSchema.safeParse({ event_id: 'invalid', rows: [] }).success, false);
  assertEquals(
    requestSchema.safeParse({
      event_id: EVENT_ID,
      rows: [{ member_id: 'member-1', answers: {} }],
    }).success,
    true,
  );
});

Deno.test('bulk-upsert-registrations trims member IDs and defaults optional uploaded keys', () => {
  const parsed = requestSchema.parse({
    event_id: EVENT_ID,
    rows: [{ member_id: ' member-1 ', answers: {} }],
  });

  assertEquals(parsed.rows[0].member_id, 'member-1');
  assertEquals(parsed.uploaded_field_keys, undefined);
});

Deno.test('chunkArray partitions member lookup IDs into bounded batches', () => {
  assertEquals(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assertEquals(chunkArray([], 200), []);
});

Deno.test('normalizeAnswer enforces required values and trims text', () => {
  assertEquals(normalizeAnswer(makeField({ is_required: true }), ''), {
    hasValue: false,
    answerText: null,
    error: 'Answer is required.',
  });
  assertEquals(normalizeAnswer(makeField(), '  response  '), {
    hasValue: true,
    answerText: 'response',
  });
});

Deno.test('normalizeAnswer parses numeric and boolean answers and enforces numeric range', () => {
  assertEquals(normalizeAnswer(makeField({ field_type: 'number' }), '12.5'), {
    hasValue: true,
    answerText: '12.5',
  });
  assertEquals(
    normalizeAnswer(makeField({ field_type: 'number', validation_rules: { min: 2, max: 10 } }), '1')
      .error,
    'Answer: value must be at least 2.',
  );
  assertEquals(normalizeAnswer(makeField({ field_type: 'boolean' }), 'YES'), {
    hasValue: true,
    answerText: 'true',
  });
});

Deno.test('normalizeAnswer validates option membership and multi-select counts', () => {
  const selectField = makeField({
    field_type: 'select',
    options: [{ label: 'Morning', value: 'morning' }],
  });
  assertEquals(
    normalizeAnswer(selectField, 'evening').error,
    'Answer: contains unsupported option value.',
  );

  const multiSelectField = makeField({
    field_type: 'multi_select',
    options: [
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' },
    ],
    validation_rules: { min_selections: 2, max_selections: 2 },
  });
  assertEquals(
    normalizeAnswer(multiSelectField, 'a').error,
    'Answer: requires at least 2 selection(s).',
  );
  assertEquals(normalizeAnswer(multiSelectField, 'a|b'), {
    hasValue: true,
    answerText: '["a","b"]',
  });
});

Deno.test('normalizeAnswer serializes valid toggle maps and rejects invalid entries', () => {
  const toggleField = makeField({
    field_type: 'multi_select_toggle',
    options: [
      { label: 'Morning', value: 'morning' },
      { label: 'Evening', value: 'evening' },
    ],
  });

  assertEquals(normalizeAnswer(toggleField, 'morning:yes; evening:no'), {
    hasValue: true,
    answerText: '{"morning":true,"evening":false}',
  });
  assertEquals(
    normalizeAnswer(toggleField, { morning: 'sometimes' }).error,
    'Answer: expected key:true/false pairs.',
  );
});
