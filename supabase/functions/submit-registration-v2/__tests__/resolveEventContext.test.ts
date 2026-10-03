import { assertEquals } from '@std/assert';

import type { SupabaseClient } from '@/shared/handler.ts';

import { resolveEventContext } from '../handlers/resolveEventContext.ts';

const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

function createMockSupabase(overrides?: {
  event?: Record<string, unknown> | null;
  user?: Record<string, unknown> | null;
  fields?: Record<string, unknown>[] | null;
  eventError?: Error | null;
  userError?: Error | null;
  fieldsError?: Error | null;
}) {
  const defaultEvent = {
    id: EVENT_ID,
    duplicate_policy: 'allow_multiple',
    registration_mode: 'open',
    registration_opens_at: null,
    registration_closes_at: null,
    allow_public_registrations: true,
    require_id_lookup: true,
    metadata: { public_registration_access: 'members_and_public' },
  };

  const defaultUser = {
    id: USER_ID,
    role: 'Usher',
  };

  const defaultFields = [
    {
      id: 'field-1',
      field_key: 'team_name',
      label: 'Team Name',
      field_type: 'text',
      applicability: 'members',
      is_required: true,
      options: [],
      validation_rules: {},
    },
  ];

  return {
    from: (table: string) => {
      if (table === 'events') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({
                    data: overrides?.event !== undefined ? overrides.event : defaultEvent,
                    error: overrides?.eventError ?? null,
                  }),
              }),
            }),
          }),
        };
      }
      if (table === 'users') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: overrides?.user !== undefined ? overrides.user : defaultUser,
                  error: overrides?.userError ?? null,
                }),
            }),
          }),
        };
      }
      if (table === 'event_fields') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () =>
                  Promise.resolve({
                    data: overrides?.fields !== undefined ? overrides.fields : defaultFields,
                    error: overrides?.fieldsError ?? null,
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

Deno.test('resolveEventContext successfully resolves event, user, and fields', async () => {
  const supabase = createMockSupabase();
  const result = await resolveEventContext(supabase, 'sample-event', 'M-123');

  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.event.id, EVENT_ID);
    assertEquals(result.data.user.id, USER_ID);
    assertEquals(result.data.fields.length, 1);
  }
});

Deno.test('resolveEventContext rejects member registration when event is public-only', async () => {
  const supabase = createMockSupabase({
    event: {
      id: EVENT_ID,
      duplicate_policy: 'allow_multiple',
      registration_mode: 'open',
      registration_opens_at: null,
      registration_closes_at: null,
      allow_public_registrations: true,
      require_id_lookup: false,
      metadata: { public_registration_access: 'public' },
    },
  });

  const result = await resolveEventContext(supabase, 'public-event', 'M-123');

  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'MEMBER_REGISTRATION_NOT_ALLOWED');
    assertEquals(result.message, 'Member registration is not allowed for this event');
    assertEquals(result.httpStatus, 200);
  }
});
