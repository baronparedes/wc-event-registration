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

Deno.test(
  'resolveEventContext rejects member registration when legacy flags indicate public-only',
  async () => {
    const supabase = createMockSupabase({
      event: {
        id: EVENT_ID,
        duplicate_policy: 'allow_multiple',
        registration_mode: 'open',
        registration_opens_at: null,
        registration_closes_at: null,
        allow_public_registrations: true,
        require_id_lookup: false,
        metadata: {},
      },
    });

    const result = await resolveEventContext(supabase, 'legacy-public-event', 'M-123');
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.errorCode, 'MEMBER_REGISTRATION_NOT_ALLOWED');
    }
  },
);

Deno.test('resolveEventContext fails when event lookup errors', async () => {
  const supabase = createMockSupabase({
    eventError: new Error('Database connection failed'),
  });

  const result = await resolveEventContext(supabase, 'sample-event', 'M-123');
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'EVENT_LOOKUP_FAILED');
    assertEquals(result.httpStatus, 500);
  }
});

Deno.test('resolveEventContext fails when event is not found', async () => {
  const supabase = createMockSupabase({ event: null });

  const result = await resolveEventContext(supabase, 'non-existent-event', 'M-123');
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'EVENT_NOT_FOUND');
    assertEquals(result.httpStatus, 200);
  }
});

Deno.test('resolveEventContext fails when registration is closed', async () => {
  const supabase = createMockSupabase({
    event: {
      id: EVENT_ID,
      duplicate_policy: 'allow_multiple',
      registration_mode: 'closed',
      registration_opens_at: null,
      registration_closes_at: null,
      allow_public_registrations: true,
      require_id_lookup: true,
      metadata: {},
    },
  });

  const result = await resolveEventContext(supabase, 'closed-event', 'M-123');
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'REGISTRATION_CLOSED');
    assertEquals(result.httpStatus, 200);
  }
});

Deno.test('resolveEventContext fails when user lookup errors', async () => {
  const supabase = createMockSupabase({
    userError: new Error('User DB error'),
  });

  const result = await resolveEventContext(supabase, 'sample-event', 'M-123');
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'USER_LOOKUP_FAILED');
    assertEquals(result.httpStatus, 500);
  }
});

Deno.test('resolveEventContext fails when member is not found', async () => {
  const supabase = createMockSupabase({ user: null });

  const result = await resolveEventContext(supabase, 'sample-event', 'M-NOTFOUND');
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'MEMBER_NOT_FOUND');
    assertEquals(result.httpStatus, 200);
  }
});

Deno.test('resolveEventContext fails when fields lookup errors', async () => {
  const supabase = createMockSupabase({
    fieldsError: new Error('Fields DB error'),
  });

  const result = await resolveEventContext(supabase, 'sample-event', 'M-123');
  assertEquals(result.ok, false);
  if (!result.ok) {
    assertEquals(result.errorCode, 'FIELDS_LOOKUP_FAILED');
    assertEquals(result.httpStatus, 500);
  }
});

Deno.test('resolveEventContext handles event fields with null options', async () => {
  const supabase = createMockSupabase({
    fields: [
      {
        id: 'f-1',
        field_key: 'notes',
        label: 'Notes',
        field_type: 'text',
        applicability: 'members',
        is_required: false,
        options: null,
        validation_rules: null,
      },
    ],
  });

  const result = await resolveEventContext(supabase, 'sample-event', 'M-123');
  assertEquals(result.ok, true);
  if (result.ok) {
    assertEquals(result.data.fields[0].options, []);
    assertEquals(result.data.fields[0].validation_rules, {});
  }
});
