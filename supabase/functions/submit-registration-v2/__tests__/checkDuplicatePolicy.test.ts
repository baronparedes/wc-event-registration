import { assertEquals } from '@std/assert';

import type { SupabaseClient } from '@/shared/handler.ts';

import { checkDuplicatePolicy } from '../handlers/checkDuplicatePolicy.ts';

function createMockSupabase(overrides?: {
  existing?: Record<string, unknown> | null;
  error?: Error | null;
}) {
  return {
    from: (table: string) => {
      if (table === 'registrations') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                order: () => ({
                  limit: () => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: overrides?.existing !== undefined ? overrides.existing : null,
                        error: overrides?.error ?? null,
                      }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;
}

Deno.test('checkDuplicatePolicy allows if policy is not block', async () => {
  const supabase = createMockSupabase();
  const result = await checkDuplicatePolicy(supabase, 'allow_multiple', 'event-1', 'user-1');
  assertEquals(result.ok, true);
});

Deno.test('checkDuplicatePolicy allows if block policy but no existing registration', async () => {
  const supabase = createMockSupabase({ existing: null });
  const result = await checkDuplicatePolicy(supabase, 'block', 'event-1', 'user-1');
  assertEquals(result.ok, true);
});

Deno.test('checkDuplicatePolicy blocks if block policy and existing registration', async () => {
  const supabase = createMockSupabase({ existing: { id: 'reg-1' } });
  const result = await checkDuplicatePolicy(supabase, 'block', 'event-1', 'user-1');
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'duplicate_blocked');
    assertEquals(result.httpStatus, 200);
  }
});

Deno.test('checkDuplicatePolicy returns 500 on db error', async () => {
  const supabase = createMockSupabase({ error: new Error('db err') });
  const result = await checkDuplicatePolicy(supabase, 'block', 'event-1', 'user-1');
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'REGISTRATION_CHECK_FAILED');
    assertEquals(result.httpStatus, 500);
  }
});
