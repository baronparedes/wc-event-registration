import { assertEquals } from '@std/assert';

import { sendWebPushNotification } from '../push.ts';

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void>) {
  return async () => {
    const original: Record<string, string | undefined> = {};
    for (const k of Object.keys(vars)) {
      original[k] = Deno.env.get(k);
      const val = vars[k];
      if (val === undefined) {
        Deno.env.delete(k);
      } else {
        Deno.env.set(k, val);
      }
    }
    try {
      await fn();
    } finally {
      for (const [k, v] of Object.entries(original)) {
        if (v === undefined) {
          Deno.env.delete(k);
        } else {
          Deno.env.set(k, v);
        }
      }
    }
  };
}

Deno.test(
  'sendWebPushNotification - simulates push in local broadcast environment',
  withEnv(
    {
      LOCAL_BROADCAST: 'true',
      SUPABASE_URL: 'http://localhost:54321',
      NODE_ENV: 'development',
    },
    async () => {
      const result = await sendWebPushNotification({
        subscription: {
          endpoint: 'https://push.example.com/sub/123',
          keys: {
            auth: 'mock-auth',
            p256dh: 'mock-p256dh',
          },
        },
        payload: {
          title: 'Local Test',
          body: 'Schedule Reminder',
          url: '/profile',
        },
        recipientId: 'user_123',
      });

      assertEquals(result.ok, true);
      assertEquals(result.status, 200);
    },
  ),
);

Deno.test(
  'sendWebPushNotification - delegates to customSender when provided',
  withEnv(
    {
      LOCAL_BROADCAST: 'false',
      VAPID_PUBLIC_KEY: 'test-public-key',
      VAPID_PRIVATE_KEY: 'test-private-key',
      NODE_ENV: 'production',
      ENVIRONMENT: 'production',
      SUPABASE_URL: 'https://live.supabase.co',
    },
    async () => {
      let sentPayload = '';
      const result = await sendWebPushNotification({
        subscription: {
          endpoint: 'https://push.example.com/sub/123',
          keys: {
            auth: 'mock-auth',
            p256dh: 'mock-p256dh',
          },
        },
        payload: {
          title: 'Prod Test',
          body: 'Reminder Text',
        },
        customSender: (_sub, payload) => {
          sentPayload = payload;
          return Promise.resolve();
        },
      });

      assertEquals(result.ok, true);
      assertEquals(result.status, 200);
      const parsed = JSON.parse(sentPayload);
      assertEquals(parsed.title, 'Prod Test');
    },
  ),
);

Deno.test(
  'sendWebPushNotification - detects expired 410/404 subscriptions',
  withEnv(
    {
      LOCAL_BROADCAST: 'false',
      VAPID_PUBLIC_KEY: 'test-public-key',
      VAPID_PRIVATE_KEY: 'test-private-key',
      NODE_ENV: 'production',
      ENVIRONMENT: 'production',
      SUPABASE_URL: 'https://live.supabase.co',
    },
    async () => {
      const result = await sendWebPushNotification({
        subscription: {
          endpoint: 'https://push.example.com/sub/stale',
          keys: {
            auth: 'mock-auth',
            p256dh: 'mock-p256dh',
          },
        },
        payload: {
          title: 'Stale Test',
          body: 'Should fail with 410',
        },
        customSender: () => {
          const err = new Error('subscription expired') as Error & { statusCode: number };
          err.statusCode = 410;
          return Promise.reject(err);
        },
      });

      assertEquals(result.ok, false);
      if (!result.ok) {
        assertEquals(result.isExpiredSubscription, true);
        assertEquals(result.status, 410);
      }
    },
  ),
);
