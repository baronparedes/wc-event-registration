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
        const selectChain: Record<string, unknown> = {};
        selectChain.eq = () => selectChain;
        selectChain.order = () => selectChain;
        selectChain.limit = () => selectChain;
        selectChain.maybeSingle = () =>
          Promise.resolve({
            data: overrides?.selectExisting !== undefined ? overrides.selectExisting : null,
            error: overrides?.selectExistingError ?? null,
          });

        return {
          select: () => selectChain,
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

Deno.test('insertRegistration fails on non-unique database error', async () => {
  const supabase = createMockSupabase({
    insertResult: null,
    insertError: {
      code: '50000',
      message: 'Connection timeout',
    },
  });
  const result = await insertRegistration(supabase, {
    eventId: 'event-1',
    userId: 'user-1',
    registrationScopeKey: 'scope-1',
    idempotencyKey: 'idemp-1',
    hasCompoundScope: false,
    duplicatePolicy: 'allow_multiple',
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'REGISTRATION_CREATE_FAILED');
    assertEquals(result.httpStatus, 500);
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

Deno.test('insertRegistration handles idempotency recovery lookup error', async () => {
  const supabase = createMockSupabase({
    insertResult: null,
    insertError: {
      code: POSTGRES_ERROR_CODES.uniqueViolation,
      message: 'registrations_event_idempotency_unique_idx',
    },
    selectExistingError: new Error('DB read error'),
  });
  const result = await insertRegistration(supabase, {
    eventId: 'event-1',
    userId: 'user-1',
    registrationScopeKey: 'scope-1',
    idempotencyKey: 'idemp-1',
    hasCompoundScope: false,
    duplicatePolicy: 'allow_multiple',
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'REGISTRATION_IDEMPOTENCY_RECOVERY_FAILED');
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

Deno.test('insertRegistration handles update failure on allow_update', async () => {
  const supabase = createMockSupabase({
    insertResult: null,
    insertError: {
      code: POSTGRES_ERROR_CODES.uniqueViolation,
      message: 'registrations_event_user_unique_idx',
    },
    selectExisting: { id: 'reg-existing', user_id: 'user-1', status: 'submitted' },
    updateError: new Error('Update failed'),
  });
  const result = await insertRegistration(supabase, {
    eventId: 'event-1',
    userId: 'user-1',
    registrationScopeKey: 'primary',
    idempotencyKey: 'new-idemp',
    hasCompoundScope: false,
    duplicatePolicy: 'allow_update',
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'REGISTRATION_UPDATE_FAILED');
    assertEquals(result.httpStatus, 500);
  }
});

Deno.test('insertRegistration blocks duplicate when duplicatePolicy is block', async () => {
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
    duplicatePolicy: 'block',
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'duplicate_blocked');
    assertEquals(result.message, 'Already registered for this event');
    assertEquals(result.httpStatus, 200);
  }
});

Deno.test('insertRegistration handles compound scope with allow_multiple_update', async () => {
  const supabase = createMockSupabase({
    insertResult: null,
    insertError: {
      code: POSTGRES_ERROR_CODES.uniqueViolation,
      message: 'registrations_event_user_unique_idx',
    },
    selectExisting: { id: 'reg-compound', user_id: 'user-1', status: 'submitted' },
  });
  const result = await insertRegistration(supabase, {
    eventId: 'event-1',
    userId: 'user-1',
    registrationScopeKey: 'compound-scope',
    idempotencyKey: 'new-idemp',
    hasCompoundScope: true,
    duplicatePolicy: 'allow_multiple_update',
  });

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.registrationId, 'reg-compound');
    assertEquals(result.data.status, 'updated');
  }
});

Deno.test('insertRegistration handles compound scope lookup error', async () => {
  const supabase = createMockSupabase({
    insertResult: null,
    insertError: {
      code: POSTGRES_ERROR_CODES.uniqueViolation,
      message: 'registrations_event_user_unique_idx',
    },
    selectExistingError: new Error('Compound lookup error'),
  });
  const result = await insertRegistration(supabase, {
    eventId: 'event-1',
    userId: 'user-1',
    registrationScopeKey: 'compound-scope',
    idempotencyKey: 'new-idemp',
    hasCompoundScope: true,
    duplicatePolicy: 'allow_multiple_update',
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'REGISTRATION_CHECK_FAILED');
  }
});

Deno.test(
  'insertRegistration rejects compound scope duplicate when existing not found',
  async () => {
    const supabase = createMockSupabase({
      insertResult: null,
      insertError: {
        code: POSTGRES_ERROR_CODES.uniqueViolation,
        message: 'registrations_event_user_unique_idx',
      },
      selectExisting: null,
    });
    const result = await insertRegistration(supabase, {
      eventId: 'event-1',
      userId: 'user-1',
      registrationScopeKey: 'compound-scope',
      idempotencyKey: 'new-idemp',
      hasCompoundScope: true,
      duplicatePolicy: 'allow_multiple_update',
    });

    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.errorCode, 'duplicate_compound_key');
      assertEquals(result.httpStatus, 200);
    }
  },
);

Deno.test('insertRegistration rejects compound scope without allow_multiple_update', async () => {
  const supabase = createMockSupabase({
    insertResult: null,
    insertError: {
      code: POSTGRES_ERROR_CODES.uniqueViolation,
      message: 'registrations_event_user_unique_idx',
    },
  });
  const result = await insertRegistration(supabase, {
    eventId: 'event-1',
    userId: 'user-1',
    registrationScopeKey: 'compound-scope',
    idempotencyKey: 'new-idemp',
    hasCompoundScope: true,
    duplicatePolicy: 'block',
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'duplicate_compound_key');
    assertEquals(result.httpStatus, 200);
  }
});

Deno.test('insertRegistration fails when allow_multiple has non-idempotent conflict', async () => {
  const supabase = createMockSupabase({
    insertResult: null,
    insertError: {
      code: POSTGRES_ERROR_CODES.uniqueViolation,
      message: 'registrations_event_user_unique_idx',
    },
  });
  const result = await insertRegistration(supabase, {
    eventId: 'event-1',
    userId: 'user-1',
    registrationScopeKey: 'scope-1',
    idempotencyKey: 'new-idemp',
    hasCompoundScope: false,
    duplicatePolicy: 'allow_multiple',
  });

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'REGISTRATION_CONFLICT_RECOVERY_FAILED');
    assertEquals(result.httpStatus, 500);
  }
});
