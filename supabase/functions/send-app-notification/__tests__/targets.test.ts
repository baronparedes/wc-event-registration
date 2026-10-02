import { assertEquals } from '@std/assert';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';

import {
  resolveAllEmails,
  resolveEventEmails,
  resolveRoleEmails,
  resolveTargetEmails,
  resolveUserEmail,
} from '../targets/index.ts';

const EVENT_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = '55555555-5555-5555-8555-555555555555';

function createMockSupabase(
  overrides: {
    regMembers?: Array<{ users: { email: string | null } }>;
    pubMembers?: Array<{ email: string | null }>;
    allUsers?: Array<{ email: string | null; role?: string | null }>;
    adminRows?: Array<{ auth_user_id: string }>;
    authUsers?: Array<{ email: string | null }>;
    userData?: { email: string | null } | null;
  } = {},
) {
  return {
    auth: {
      admin: {
        getUserById: (id: string) => {
          if (overrides.authUsers) {
            return Promise.resolve({
              data: { user: { email: overrides.authUsers[0]?.email ?? null } },
              error: null,
            });
          }
          if (overrides.userData !== undefined) {
            return Promise.resolve({
              data: overrides.userData ? { user: { email: overrides.userData.email } } : null,
              error: overrides.userData ? null : { message: 'User not found' },
            });
          }
          return Promise.resolve({
            data: {
              user: { email: id === 'admin-uuid' ? 'admin@example.com' : 'user@example.com' },
            },
            error: null,
          });
        },
      },
    },
    from: (table: string) => {
      if (table === 'registrations') {
        return {
          select: () => ({
            eq: () => ({
              neq: () =>
                Promise.resolve({
                  data: overrides.regMembers ?? [{ users: { email: 'member1@example.com' } }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'public_registrations') {
        return {
          select: () => ({
            eq: () => ({
              neq: () =>
                Promise.resolve({
                  data: overrides.pubMembers ?? [{ email: 'guest1@example.com' }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'users') {
        return {
          select: () => ({
            not: () =>
              Promise.resolve({
                data: overrides.allUsers ?? [
                  { email: 'member1@example.com', role: 'Usher' },
                  { email: 'member2@example.com', role: 'Prayer Coach' },
                ],
                error: null,
              }),
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data:
                    overrides.userData !== undefined
                      ? overrides.userData
                      : { email: 'user@example.com' },
                  error: null,
                }),
            }),
            in: () =>
              Promise.resolve({
                data: overrides.authUsers ?? [{ email: 'admin@example.com' }],
                error: null,
              }),
          }),
        };
      }
      if (table === 'admins') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: overrides.adminRows ?? [{ auth_user_id: 'admin-uuid' }],
                error: null,
              }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient<Database>;
}

Deno.test('resolveEventEmails extracts unique member and public emails', async () => {
  const supabase = createMockSupabase({
    regMembers: [
      { users: { email: 'Shared@example.com' } },
      { users: { email: 'member@example.com' } },
    ],
    pubMembers: [{ email: 'shared@example.com' }, { email: 'guest@example.com' }],
  });

  const emails = await resolveEventEmails(supabase, EVENT_ID);
  assertEquals(emails.sort(), ['guest@example.com', 'member@example.com', 'shared@example.com']);
});

Deno.test('resolveAllEmails retrieves all non-null user emails', async () => {
  const supabase = createMockSupabase({
    allUsers: [{ email: 'user1@example.com' }, { email: 'user2@example.com' }, { email: null }],
  });

  const emails = await resolveAllEmails(supabase);
  assertEquals(emails, ['user1@example.com', 'user2@example.com']);
});

Deno.test('resolveRoleEmails resolves both member and admin emails for roles', async () => {
  const supabase = createMockSupabase({
    allUsers: [
      { email: 'usher@example.com', role: 'Usher' },
      { email: 'other@example.com', role: 'Singer' },
    ],
    adminRows: [{ auth_user_id: 'admin-uuid' }],
    authUsers: [{ email: 'admin@example.com' }],
  });

  const emails = await resolveRoleEmails(supabase, ['usher', 'admin']);
  assertEquals(emails.sort(), ['admin@example.com', 'usher@example.com']);
});

Deno.test('resolveUserEmail resolves single user email', async () => {
  const supabase = createMockSupabase({
    userData: { email: 'target@example.com' },
  });

  const emails = await resolveUserEmail(supabase, USER_ID);
  assertEquals(emails, ['target@example.com']);
});

Deno.test('resolveTargetEmails dispatches according to targetType', async () => {
  const supabase = createMockSupabase();

  const eventEmails = await resolveTargetEmails({
    supabase,
    targetType: 'event',
    targetEventId: EVENT_ID,
  });
  assertEquals(eventEmails.length, 2);

  const emptyEvent = await resolveTargetEmails({
    supabase,
    targetType: 'event',
    targetEventId: null,
  });
  assertEquals(emptyEvent, []);

  const emptyRole = await resolveTargetEmails({
    supabase,
    targetType: 'role',
    targetRoles: [],
  });
  assertEquals(emptyRole, []);

  const emptyUser = await resolveTargetEmails({
    supabase,
    targetType: 'user',
    targetUserId: null,
  });
  assertEquals(emptyUser, []);
});
