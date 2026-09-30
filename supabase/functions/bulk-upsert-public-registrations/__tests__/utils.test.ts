import { assertEquals } from '@std/assert';

import {
  type BulkRow,
  findDuplicateEmailIndexes,
  requestSchema,
  toPublicRegistrationRpcRow,
} from '../utils.ts';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';

function makeRow(overrides: Partial<BulkRow> = {}): BulkRow {
  return {
    first_name: 'Test',
    last_name: 'Member',
    nickname: 'Sample',
    email: 'test@example.com',
    phone: '555-0100',
    answers: {},
    ...overrides,
  };
}

Deno.test('bulk-upsert-public-registrations validates event, row, and email requirements', () => {
  assertEquals(requestSchema.safeParse({ event_id: 'invalid', rows: [] }).success, false);
  assertEquals(
    requestSchema.safeParse({
      event_id: EVENT_ID,
      rows: [makeRow({ email: 'not-an-email' })],
    }).success,
    false,
  );
  assertEquals(requestSchema.safeParse({ event_id: EVENT_ID, rows: [makeRow()] }).success, true);
});

Deno.test('findDuplicateEmailIndexes detects duplicates case-insensitively', () => {
  assertEquals(
    findDuplicateEmailIndexes([
      { email: 'Person@example.com' },
      { email: 'unique@example.com' },
      { email: ' person@EXAMPLE.com ' },
    ]),
    new Set([0, 2]),
  );
});

Deno.test(
  'toPublicRegistrationRpcRow trims identity fields and nulls blank optional fields',
  () => {
    assertEquals(
      toPublicRegistrationRpcRow(
        makeRow({
          first_name: ' Test ',
          last_name: ' Member ',
          nickname: '  ',
          email: ' test@example.com ',
          phone: '  ',
        }),
      ),
      {
        first_name: 'Test',
        last_name: 'Member',
        nickname: null,
        email: 'test@example.com',
        phone: null,
      },
    );
  },
);
