import { assertEquals } from '@std/assert';

import { findUnsupportedAnswerKeys, requestSchema } from '../utils.ts';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const REGISTRATION_ID = '22222222-2222-4222-8222-222222222222';
const PUBLIC_REGISTRATION_ID = '33333333-3333-4333-8333-333333333333';

Deno.test('bulk-upsert-attendance-answers requires the matching ID for each attendee kind', () => {
  const registeredWithoutId = requestSchema.safeParse({
    event_id: EVENT_ID,
    rows: [{ attendee_kind: 'registered', answers: {} }],
  });
  const publicWithoutId = requestSchema.safeParse({
    event_id: EVENT_ID,
    rows: [{ attendee_kind: 'public', answers: {} }],
  });

  assertEquals(registeredWithoutId.success, false);
  assertEquals(publicWithoutId.success, false);
  assertEquals(
    requestSchema.safeParse({
      event_id: EVENT_ID,
      rows: [{ attendee_kind: 'registered', registration_id: REGISTRATION_ID, answers: {} }],
    }).success,
    true,
  );
  assertEquals(
    requestSchema.safeParse({
      event_id: EVENT_ID,
      rows: [
        {
          attendee_kind: 'public',
          public_registration_id: PUBLIC_REGISTRATION_ID,
          answers: {},
        },
      ],
    }).success,
    true,
  );
});

Deno.test('bulk-upsert-attendance-answers rejects invalid event IDs and empty row batches', () => {
  assertEquals(requestSchema.safeParse({ event_id: 'invalid', rows: [] }).success, false);
  assertEquals(requestSchema.safeParse({ event_id: EVENT_ID, rows: [] }).success, false);
});

Deno.test('findUnsupportedAnswerKeys preserves unknown keys in input order', () => {
  assertEquals(
    findUnsupportedAnswerKeys(['field_a', 'not_uploaded', 'also_unknown'], new Set(['field_a'])),
    ['not_uploaded', 'also_unknown'],
  );
});
