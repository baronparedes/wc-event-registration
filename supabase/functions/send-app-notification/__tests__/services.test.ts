import { assertEquals, assertRejects } from '@std/assert';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/shared/database.types.ts';

import { sendEmailNotifications } from '../services/emailService.ts';
import { sendPushNotifications } from '../services/pushService.ts';

const NOTIFICATION_ID = '33333333-3333-4333-8333-333333333333';
const EVENT_ID = '44444444-4444-4444-8444-444444444444';
const USER_ID = '55555555-5555-5555-8555-555555555555';

async function withEnv(run: () => Promise<void>) {
  const previousSupabase = Deno.env.get('SUPABASE_URL');
  const previousNodeEnv = Deno.env.get('NODE_ENV');
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('NODE_ENV', 'test');
  try {
    await run();
  } finally {
    if (previousSupabase === undefined) Deno.env.delete('SUPABASE_URL');
    else Deno.env.set('SUPABASE_URL', previousSupabase);

    if (previousNodeEnv === undefined) Deno.env.delete('NODE_ENV');
    else Deno.env.set('NODE_ENV', previousNodeEnv);
  }
}

function createMockSupabase(
  options: {
    broadcastError?: boolean;
    notificationId?: string | null;
    recipients?: string[];
    regMembers?: Array<{ users: { email: string | null } }>;
    pubMembers?: Array<{ email: string | null }>;
  } = {},
) {
  const calls: Array<{ type: string; name: string; args?: unknown }> = [];

  const client = {
    rpc: (name: string, args?: unknown) => {
      calls.push({ type: 'rpc', name, args });
      if (name === 'broadcast_app_notification') {
        if (options.broadcastError) {
          return Promise.resolve({ data: null, error: { message: 'broadcast error' } });
        }
        return Promise.resolve({
          data: options.notificationId !== undefined ? options.notificationId : NOTIFICATION_ID,
          error: null,
        });
      }
      if (name === 'enqueue_email_notification') {
        return Promise.resolve({ data: 1, error: null });
      }
      if (name === 'trigger_email_processor') {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    from: (table: string) => {
      calls.push({ type: 'from', name: table });
      if (table === 'app_notification_recipients') {
        return {
          select: () => ({
            eq: () =>
              Promise.resolve({
                data: (options.recipients ?? [USER_ID]).map((id) => ({ user_id: id })),
                error: null,
              }),
            in: () => ({
              eq: () =>
                Promise.resolve({
                  data: [{ user_id: USER_ID }],
                  error: null,
                }),
            }),
          }),
        };
      }
      if (table === 'user_push_subscriptions') {
        return {
          select: () => ({
            in: () =>
              Promise.resolve({
                data: [],
                error: null,
              }),
          }),
        };
      }
      if (table === 'registrations') {
        return {
          select: () => ({
            eq: () => ({
              neq: () =>
                Promise.resolve({
                  data: options.regMembers ?? [{ users: { email: 'user@example.com' } }],
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
                  data: options.pubMembers ?? [{ email: 'guest@example.com' }],
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
                data: [{ email: 'user@example.com' }],
                error: null,
              }),
            eq: () => ({
              maybeSingle: () =>
                Promise.resolve({
                  data: { email: 'user@example.com' },
                  error: null,
                }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient<Database>;

  return { client, calls };
}

Deno.test('sendPushNotifications broadcasts and returns recipient count', async () => {
  await withEnv(async () => {
    const { client, calls } = createMockSupabase({ recipients: [USER_ID, 'user-2'] });

    const result = await sendPushNotifications({
      supabase: client,
      payload: {
        title: 'Reminder',
        message: 'Service starts soon',
        channels: ['push'],
        targetType: 'event',
        targetEventId: EVENT_ID,
      },
      userId: 'admin-id',
    });

    assertEquals(result, {
      notificationId: NOTIFICATION_ID,
      pushCount: 2,
    });

    const broadcastCall = calls.find((c) => c.name === 'broadcast_app_notification');
    assertEquals(!!broadcastCall, true);
  });
});

Deno.test('sendPushNotifications throws error when broadcast RPC fails', async () => {
  await withEnv(async () => {
    const { client } = createMockSupabase({ broadcastError: true });

    await assertRejects(
      () =>
        sendPushNotifications({
          supabase: client,
          payload: {
            title: 'Reminder',
            message: 'Service starts soon',
            channels: ['push'],
            targetType: 'all',
          },
        }),
      Error,
      'Failed to broadcast notification',
    );
  });
});

Deno.test(
  'sendEmailNotifications resolves target emails and triggers queue processor',
  async () => {
    await withEnv(async () => {
      const { client, calls } = createMockSupabase({
        regMembers: [{ users: { email: 'member@example.com' } }],
        pubMembers: [{ email: 'public@example.com' }],
      });

      const result = await sendEmailNotifications({
        supabase: client,
        payload: {
          title: 'Update',
          message: 'New info',
          channels: ['email'],
          targetType: 'event',
          targetEventId: EVENT_ID,
        },
      });

      assertEquals(result.emailCount, 2);

      const enqueueCalls = calls.filter((c) => c.name === 'enqueue_email_notification');
      assertEquals(enqueueCalls.length, 2);

      const triggerCall = calls.find((c) => c.name === 'trigger_email_processor');
      assertEquals(!!triggerCall, true);
    });
  },
);
