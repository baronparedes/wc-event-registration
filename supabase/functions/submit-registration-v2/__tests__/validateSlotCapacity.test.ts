import { assertEquals } from '@std/assert';

import type { SupabaseClient } from '@/shared/handler.ts';

import { validateSlotCapacity } from '../handlers/validateSlotCapacity.ts';

function createMockSupabase(overrides?: {
  answers?: unknown[] | null;
  answersError?: Error | null;
  users?: unknown[] | null;
  usersError?: Error | null;
}) {
  return {
    from: (table: string) => {
      if (table === 'registration_answers') {
        const query = {
          select: () => query,
          eq: () => query,
          neq: () => query,
          returns: () =>
            Promise.resolve({
              data: overrides?.answers !== undefined ? overrides.answers : [],
              error: overrides?.answersError ?? null,
            }),
        };
        return query;
      }
      if (table === 'users') {
        const query = {
          select: () => query,
          in: () => query,
          returns: () =>
            Promise.resolve({
              data: overrides?.users !== undefined ? overrides.users : [],
              error: overrides?.usersError ?? null,
            }),
        };
        return query;
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;
}

Deno.test('validateSlotCapacity passes when no slot fields', async () => {
  const supabase = createMockSupabase();
  const fields = [
    {
      id: 'field-1',
      field_key: 'team_name',
      label: 'Team Name',
      field_type: 'text' as const,
      applicability: 'members_and_public' as const,
      is_required: true,
      options: [],
      validation_rules: {},
    },
  ];
  const responses = { team_name: 'Alpha' };

  const result = await validateSlotCapacity(supabase, {
    fields,
    responses,
    registrationId: 'reg-1',
    isNew: true,
    memberRole: 'Usher',
  });

  assertEquals(result.ok, true);
});

Deno.test('validateSlotCapacity fails when global slot capacity is reached', async () => {
  const supabase = createMockSupabase({
    answers: [
      {
        answer_text: 'opt-1',
        registration_id: 'reg-a',
        registrations: { status: 'submitted', user_id: 'user-1' },
      },
      {
        answer_text: 'opt-1',
        registration_id: 'reg-b',
        registrations: { status: 'submitted', user_id: 'user-2' },
      },
    ],
  });

  const fields = [
    {
      id: 'field-1',
      field_key: 'slot_field',
      label: 'Slot',
      field_type: 'select' as const,
      applicability: 'members_and_public' as const,
      is_required: true,
      options: [{ id: 'opt-1', label: 'Opt 1', value: 'opt-1' }],
      validation_rules: { max_slots: { 'opt-1': 2 } },
    },
  ];
  const responses = { slot_field: 'opt-1' };

  const result = await validateSlotCapacity(supabase, {
    fields,
    responses,
    registrationId: 'reg-1',
    isNew: true,
    memberRole: 'Usher',
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'VALIDATION_FAILED');
  }
});

Deno.test('validateSlotCapacity passes when global slot capacity is not reached', async () => {
  const supabase = createMockSupabase({
    answers: [
      {
        answer_text: 'opt-1',
        registration_id: 'reg-a',
        registrations: { status: 'submitted', user_id: 'user-1' },
      },
    ],
  });

  const fields = [
    {
      id: 'field-1',
      field_key: 'slot_field',
      label: 'Slot',
      field_type: 'select' as const,
      applicability: 'members_and_public' as const,
      is_required: true,
      options: [{ id: 'opt-1', label: 'Opt 1', value: 'opt-1' }],
      validation_rules: { max_slots: { 'opt-1': 2 } },
    },
  ];
  const responses = { slot_field: 'opt-1' };

  const result = await validateSlotCapacity(supabase, {
    fields,
    responses,
    registrationId: 'reg-1',
    isNew: true,
    memberRole: 'Usher',
  });

  assertEquals(result.ok, true);
});

Deno.test('validateSlotCapacity fails when user lacks required role slots', async () => {
  const supabase = createMockSupabase({
    answers: [
      {
        answer_text: 'opt-1',
        registration_id: 'reg-a',
        registrations: { status: 'submitted', user_id: 'user-1' },
      },
    ],
    users: [{ id: 'user-1', role: 'member' }],
  });

  const fields = [
    {
      id: 'field-1',
      field_key: 'slot_field',
      label: 'Slot',
      field_type: 'select' as const,
      applicability: 'members_and_public' as const,
      is_required: true,
      options: [{ id: 'opt-1', label: 'Opt 1', value: 'opt-1' }],
      validation_rules: { max_slots_role_allotments: { 'opt-1': { member: 1 } } },
    },
  ];
  const responses = { slot_field: 'opt-1' };

  const result = await validateSlotCapacity(supabase, {
    fields,
    responses,
    registrationId: 'reg-new',
    isNew: true,
    memberRole: 'member',
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'VALIDATION_FAILED');
  }
});

Deno.test('validateSlotCapacity passes when user has required role slots', async () => {
  const supabase = createMockSupabase({
    answers: [],
    users: [],
  });

  const fields = [
    {
      id: 'field-1',
      field_key: 'slot_field',
      label: 'Slot',
      field_type: 'select' as const,
      applicability: 'members_and_public' as const,
      is_required: true,
      options: [{ id: 'opt-1', label: 'Opt 1', value: 'opt-1' }],
      validation_rules: { max_slots_role_allotments: { 'opt-1': { member: 1 } } },
    },
  ];
  const responses = { slot_field: 'opt-1' };

  const result = await validateSlotCapacity(supabase, {
    fields,
    responses,
    registrationId: 'reg-new',
    isNew: true,
    memberRole: 'member',
  });

  assertEquals(result.ok, true);
});
