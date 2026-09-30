import { assertEquals } from '@std/assert';

import { type ExistingMember, type InputRow, requestSchema, resolveRows } from '../logic.ts';

function makeRow(overrides: Partial<InputRow> = {}): InputRow {
  return {
    row_number: 2,
    member_id: 'member-new',
    first_name: 'Test',
    last_name: 'Member',
    nickname: 'Sample',
    email: null,
    phone: null,
    date_of_birth: null,
    role: 'Attendee',
    category: 'Participant',
    metadata: {},
    ...overrides,
  };
}

function makeMember(overrides: Partial<ExistingMember> = {}): ExistingMember {
  return {
    id: 'existing-member',
    member_id: 'member-existing',
    first_name: 'Test',
    last_name: 'Member',
    nickname: 'Sample',
    email: null,
    ...overrides,
  };
}

Deno.test(
  'bulk upsert member rows preserve role and category through validation and resolution',
  () => {
    const parsed = requestSchema.parse({
      rows: [
        {
          row_number: 2,
          member_id: '1247528786',
          first_name: 'Edrienne Myenna',
          last_name: 'Magat',
          nickname: 'Yen',
          email: null,
          phone: null,
          date_of_birth: null,
          role: 'Prayer Coach',
          category: 'Ladies',
          metadata: { sr_pwd: false },
        },
      ],
    });

    const result = resolveRows(parsed.rows, []);

    assertEquals(result.errors, []);
    assertEquals(result.resolvedRows[0].role, 'Prayer Coach');
    assertEquals(result.resolvedRows[0].category, 'Ladies');
  },
);

Deno.test('bulk upsert resolves member ID matches as updates and retains role and category', () => {
  const result = resolveRows(
    [makeRow({ member_id: 'member-existing', role: 'Prayer Coach', category: 'Ladies' })],
    [makeMember()],
  );

  assertEquals(result.errors, []);
  assertEquals(result.resolvedRows[0].operation, 'update');
  assertEquals(result.resolvedRows[0].target_id, 'existing-member');
  assertEquals(result.resolvedRows[0].role, 'Prayer Coach');
  assertEquals(result.resolvedRows[0].category, 'Ladies');
});

Deno.test('bulk upsert resolves a normalized name triplet when the member ID changes', () => {
  const result = resolveRows(
    [
      makeRow({
        first_name: ' test ',
        last_name: 'member',
        nickname: ' sample ',
      }),
    ],
    [makeMember()],
  );

  assertEquals(result.errors, []);
  assertEquals(result.resolvedRows[0].operation, 'update');
  assertEquals(result.resolvedRows[0].target_id, 'existing-member');
  assertEquals(result.resolvedRows[0].member_id, 'member-new');
});

Deno.test('bulk upsert rejects when member ID and name triplet identify different members', () => {
  const result = resolveRows(
    [makeRow({ member_id: 'member-first', first_name: 'Other' })],
    [
      makeMember({ id: 'first-member', member_id: 'member-first' }),
      makeMember({ id: 'second-member', member_id: 'member-second', first_name: 'Other' }),
    ],
  );

  assertEquals(result.resolvedRows, []);
  assertEquals(result.errors, [
    'Row 2: RFID matches one member while Firstname+Surname+Nickname matches a different member.',
  ]);
});

Deno.test('bulk upsert aborts the batch when an email appears more than once', () => {
  const result = resolveRows(
    [
      makeRow({ row_number: 2, email: 'same@example.com' }),
      makeRow({
        row_number: 3,
        member_id: 'another-member',
        first_name: 'Another',
        email: 'SAME@example.com',
      }),
    ],
    [],
  );

  assertEquals(result.resolvedRows, []);
  assertEquals(result.errors, [
    'Row 2: Email appears multiple times in this CSV batch.',
    'Row 3: Email appears multiple times in this CSV batch.',
  ]);
});

Deno.test('bulk upsert rejects an email already owned by a different member', () => {
  const result = resolveRows(
    [makeRow({ email: 'owned@example.com' })],
    [makeMember({ id: 'email-owner', first_name: 'Unrelated', email: 'owned@example.com' })],
  );

  assertEquals(result.resolvedRows, []);
  assertEquals(result.errors, ['Row 2: Email already belongs to another member record.']);
});
