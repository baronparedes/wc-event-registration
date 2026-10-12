import { assertEquals } from '@std/assert';

import { POSTGRES_ERROR_CODES } from '@/shared/constants.ts';
import type { SupabaseClient } from '@/shared/handler.ts';

import { insertRegistration } from '../handlers/insertRegistration.ts';

function createMockSupabase(overrides?: {
  selectExisting?: Record<string, unknown> | null;
  selectExistingError?: Error | null;
  insertResult?: Record<string, unknown> | null;
  insertError?: { code: string; message: string; details?: string; hint?: string } | null;
  updateResult?: Record<string, unknown> | null;
  updateError?: Error | null;
}) {
  return {
    from: (table: string) => {
      if (table === 'registrations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: () =>
                        Promise.resolve({
                          data:
                            overrides?.selectExisting !== undefined
                              ? overrides.selectExisting
                              : null,
                          error: overrides?.selectExistingError ?? null,
                        }),
                    }),
                  }),
                  maybeSingle: () =>
                    Promise.resolve({
                      data:
                        overrides?.selectExisting !== undefined ? overrides.selectExisting : null,
                      error: overrides?.selectExistingError ?? null,
                    }),
                }),
                maybeSingle: () =>
                  Promise.resolve({
                    data: overrides?.selectExisting !== undefined ? overrides.selectExisting : null,
                    error: overrides?.selectExistingError ?? null,
                  }),
              }),
            }),
          }),
          insert: () => ({
            select: () => ({
              single: () =>
                Promise.resolve({
                  data:
                    overrides?.insertResult !== undefined
                      ? overrides.insertResult
                      : { id: 'reg-new' },
                  error: overrides?.insertError ?? null,
                }),
            }),
          }),
          update: () => ({
            eq: () =>
              Promise.resolve({
                data:
                  overrides?.updateResult !== undefined
                    ? overrides.updateResult
                    : { id: 'reg-updated' },
                error: overrides?.updateError ?? null,
              }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;
}

Deno.test('insertRegistration successfully inserts new registration', async () => {
  const supabase = createMockSupabase({ insertError: null });
  const result = await insertRegistration(supabase, {
    eventId: 'event-1',
    userId: 'user-1',
    registrationScopeKey: 'scope-1',
    idempotencyKey: 'idemp-1',
    hasCompoundScope: false,
    duplicatePolicy: 'allow_multiple',
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.isNew, true);
    assertEquals(result.data.registrationId, 'reg-new');
    assertEquals(result.data.shouldWriteAnswers, true);
  }
});

Deno.test('insertRegistration correctly handles idempotent replay', async () => {
  const supabase = createMockSupabase({
    insertResult: null,
    insertError: {
      code: POSTGRES_ERROR_CODES.uniqueViolation,
      message: 'registrations_event_idempotency_unique_idx',
    },
    selectExisting: { id: 'reg-existing', user_id: 'user-1', status: 'submitted' },
  });
  const result = await insertRegistration(supabase, {
    eventId: 'event-1',
    userId: 'user-1',
    registrationScopeKey: 'scope-1',
    idempotencyKey: 'idemp-1',
    hasCompoundScope: false,
    duplicatePolicy: 'allow_multiple',
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.isNew, false);
    assertEquals(result.data.registrationId, 'reg-existing');
    assertEquals(result.data.shouldWriteAnswers, false);
  }
});

Deno.test('insertRegistration correctly handles update (allow_update)', async () => {
  const supabase = createMockSupabase({
    insertResult: null,
    insertError: {
      code: POSTGRES_ERROR_CODES.uniqueViolation,
      message: 'registrations_event_user_unique_idx',
    },
    selectExisting: { id: 'reg-existing', user_id: 'user-1', status: 'submitted' },
  });
  const result = await insertRegistration(supabase, {
    eventId: 'event-1',
    userId: 'user-1',
    registrationScopeKey: 'primary',
    idempotencyKey: 'new-idemp',
    hasCompoundScope: false,
    duplicatePolicy: 'allow_update',
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.isNew, false);
    assertEquals(result.data.registrationId, 'reg-existing');
    assertEquals(result.data.shouldWriteAnswers, true);
  }
});
