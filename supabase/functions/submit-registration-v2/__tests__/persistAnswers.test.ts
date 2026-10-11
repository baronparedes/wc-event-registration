import { assertEquals } from '@std/assert';
import type { SupabaseClient } from '@/shared/handler.ts';
import { persistAnswers } from '../handlers/persistAnswers.ts';

function createMockSupabase(overrides?: {
  deleteError?: Error | null;
  insertError?: Error | null;
}) {
  return {
    from: (table: string) => {
      if (table === 'registration_answers') {
        return {
          delete: () => ({
            eq: () =>
              Promise.resolve({
                error: overrides?.deleteError ?? null,
              }),
          }),
          insert: () =>
            Promise.resolve({
              error: overrides?.insertError ?? null,
            }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;
}

Deno.test('persistAnswers successfully inserts new answers', async () => {
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
    }
  ];
  const responses = { team_name: 'Alpha' };

  const result = await persistAnswers(supabase, {
    registrationId: 'reg-1',
    responses,
    fields,
    isNew: true,
  });

  assertEquals(result.ok, true);
});

Deno.test('persistAnswers successfully updates answers', async () => {
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
    }
  ];
  const responses = { team_name: 'Alpha' };

  const result = await persistAnswers(supabase, {
    registrationId: 'reg-1',
    responses,
    fields,
    isNew: false, // Should trigger delete first
  });

  assertEquals(result.ok, true);
});

Deno.test('persistAnswers fails if insert fails', async () => {
  const supabase = createMockSupabase({ insertError: new Error('insert err') });
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
    }
  ];
  const responses = { team_name: 'Alpha' };

  const result = await persistAnswers(supabase, {
    registrationId: 'reg-1',
    responses,
    fields,
    isNew: true,
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'ANSWERS_INSERT_FAILED');
  }
});
