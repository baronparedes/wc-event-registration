import { assertEquals } from '@std/assert';

import { handleCronProcessPushReminders } from '../handler.ts';

type QueueMessage = {
  msg_id: number;
  read_ct: number;
  message: {
    user_id?: string;
    message?: string;
    target_url?: string;
  };
};

const SERVICE_ROLE_KEY = 'test-service-role-key';
const TEST_ORIGIN = 'https://app.example.com';
const USER_ID = '11111111-1111-4111-8111-111111111111';

async function withFunctionEnv(run: () => Promise<void>) {
  const previousValues = new Map<string, string | undefined>(
    [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'CRON_ROLE_KEY',
      'ALLOWED_ORIGINS',
      'VAPID_PUBLIC_KEY',
      'VAPID_PRIVATE_KEY',
    ].map((name) => [name, Deno.env.get(name)]),
  );

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
  Deno.env.set('CRON_ROLE_KEY', 'test-cron-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);
  Deno.env.set('VAPID_PUBLIC_KEY', 'test-public-key');
  Deno.env.set('VAPID_PRIVATE_KEY', 'test-private-key');

  try {
    await run();
  } finally {
    for (const [name, value] of previousValues) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function buildRequest(authorized = true) {
  const headers = new Headers({ origin: TEST_ORIGIN, 'content-type': 'application/json' });
  if (authorized) headers.set('authorization', `Bearer ${SERVICE_ROLE_KEY}`);
  return new Request('https://example.functions/cron-process-push-reminders', {
    method: 'POST',
    headers,
    body: '{}',
  });
}

function mockFetch(options: { batches: QueueMessage[][]; subscriptions?: unknown[] }) {
  const originalFetch = globalThis.fetch;
  const archivedIds: number[] = [];
  const deletedSubscriptionIds: string[] = [];
  const rpcPaths: string[] = [];
  let batchIndex = 0;

  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname.startsWith('/rest/v1/rpc/')) {
      rpcPaths.push(requestUrl.pathname);
    }
    if (requestUrl.pathname === '/rest/v1/rpc/generate_upcoming_sunday_push_reminders') {
      return Promise.resolve(Response.json(null));
    }
    if (requestUrl.pathname === '/rest/v1/rpc/pop_push_reminders') {
      return Promise.resolve(Response.json(options.batches[batchIndex++] ?? []));
    }
    if (requestUrl.pathname === '/rest/v1/rpc/archive_push_reminder') {
      const body = JSON.parse(String(init?.body)) as { message_id: number };
      archivedIds.push(body.message_id);
      return Promise.resolve(Response.json(true));
    }
    if (requestUrl.pathname === '/rest/v1/rpc/update_push_reminder_delivery_stats') {
      return Promise.resolve(Response.json(null));
    }
    if (requestUrl.pathname === '/rest/v1/user_push_subscriptions' && init?.method === 'DELETE') {
      const ids = requestUrl.searchParams.get('id') ?? '';
      deletedSubscriptionIds.push(
        ...Array.from(ids.matchAll(/[0-9a-f-]{36}/g), (match) => match[0]),
      );
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    if (requestUrl.pathname === '/rest/v1/user_push_subscriptions') {
      return Promise.resolve(Response.json(options.subscriptions ?? []));
    }

    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    archivedIds,
    deletedSubscriptionIds,
    rpcPaths,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'cron-process-push-reminders rejects requests without a service or cron key',
  async () => {
    await withFunctionEnv(async () => {
      const response = await handleCronProcessPushReminders(buildRequest(false), () =>
        Promise.resolve(),
      );
      assertEquals(response.status, 401);
    });
  },
);

Deno.test(
  'cron-process-push-reminders accepts an authenticated cron request without an origin',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ batches: [[]] });
      const response = await handleCronProcessPushReminders(
        new Request('https://example.functions/cron-process-push-reminders', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-cron-key': 'test-cron-role-key',
          },
          body: '{}',
        }),
        () => Promise.resolve(),
      );

      try {
        assertEquals(response.status, 200);
        assertEquals(await response.json(), { success: true, processed: 0 });
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cron-process-push-reminders sends queued notifications without generating reminders',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        batches: [
          [
            {
              msg_id: 51,
              read_ct: 1,
              message: {
                user_id: USER_ID,
                message: 'Your Sunday service is coming up.',
                target_url: '/profile?tab=commitments',
              },
            },
          ],
          [],
        ],
        subscriptions: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            endpoint: 'https://push.example/subscription',
            auth_key: 'auth-key',
            p256dh_key: 'p256dh-key',
          },
        ],
      });
      const sent: Array<{ endpoint: string; payload: string }> = [];
      try {
        const response = await handleCronProcessPushReminders(
          buildRequest(),
          (subscription, payload) => {
            sent.push({ endpoint: subscription.endpoint, payload });
            return Promise.resolve();
          },
        );
        assertEquals(response.status, 200);
        assertEquals(await response.json(), { success: true, processed: 1 });
        assertEquals(sent, [
          {
            endpoint: 'https://push.example/subscription',
            payload: JSON.stringify({
              title: 'Service Reminder',
              body: 'Your Sunday service is coming up.',
              url: '/profile?tab=commitments',
            }),
          },
        ]);
        assertEquals(fetchMock.archivedIds, [51]);
        assertEquals(
          fetchMock.rpcPaths.includes('/rest/v1/rpc/generate_upcoming_sunday_push_reminders'),
          false,
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cron-process-push-reminders drains batches with bounded delivery concurrency',
  async () => {
    await withFunctionEnv(async () => {
      const firstBatch = Array.from({ length: 7 }, (_, index) => ({
        msg_id: 60 + index,
        read_ct: 1,
        message: { user_id: USER_ID, message: 'Your Sunday service is coming up.' },
      }));
      const secondBatch = Array.from({ length: 2 }, (_, index) => ({
        msg_id: 67 + index,
        read_ct: 1,
        message: { user_id: USER_ID, message: 'Your Sunday service is coming up.' },
      }));
      const fetchMock = mockFetch({
        batches: [firstBatch, secondBatch, []],
        subscriptions: [
          {
            id: '66666666-6666-4666-8666-666666666666',
            endpoint: 'https://push.example/subscription',
            auth_key: 'auth-key',
            p256dh_key: 'p256dh-key',
          },
        ],
      });
      let activeSends = 0;
      let maxActiveSends = 0;
      try {
        const response = await handleCronProcessPushReminders(buildRequest(), async () => {
          activeSends++;
          maxActiveSends = Math.max(maxActiveSends, activeSends);
          await new Promise((resolve) => setTimeout(resolve, 1));
          activeSends--;
        });
        assertEquals(await response.json(), { success: true, processed: 9 });
        assertEquals(fetchMock.archivedIds.length, 9);
        assertEquals(
          fetchMock.rpcPaths.filter((path) => path.endsWith('/pop_push_reminders')).length,
          3,
        );
        assertEquals(maxActiveSends, 5);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cron-process-push-reminders leaves transient delivery failures queued for retry',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        batches: [
          [
            {
              msg_id: 54,
              read_ct: 1,
              message: { user_id: USER_ID, message: 'Your Sunday service is coming up.' },
            },
          ],
          [],
        ],
        subscriptions: [
          {
            id: '44444444-4444-4444-8444-444444444444',
            endpoint: 'https://push.example/subscription',
            auth_key: 'auth-key',
            p256dh_key: 'p256dh-key',
          },
        ],
      });
      try {
        const response = await handleCronProcessPushReminders(buildRequest(), () =>
          Promise.reject(Object.assign(new Error('Temporary push failure'), { statusCode: 503 })),
        );
        assertEquals(response.status, 200);
        assertEquals(fetchMock.archivedIds, []);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cron-process-push-reminders archives delivery failures after five attempts',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        batches: [
          [
            {
              msg_id: 55,
              read_ct: 5,
              message: { user_id: USER_ID, message: 'Your Sunday service is coming up.' },
            },
          ],
          [],
        ],
        subscriptions: [
          {
            id: '55555555-5555-4555-8555-555555555555',
            endpoint: 'https://push.example/subscription',
            auth_key: 'auth-key',
            p256dh_key: 'p256dh-key',
          },
        ],
      });
      try {
        const response = await handleCronProcessPushReminders(buildRequest(), () =>
          Promise.reject(Object.assign(new Error('Permanent push failure'), { statusCode: 503 })),
        );
        assertEquals(response.status, 200);
        assertEquals(fetchMock.archivedIds, [55]);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'cron-process-push-reminders archives malformed messages and removes expired subscriptions',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        batches: [
          [
            { msg_id: 52, read_ct: 1, message: {} },
            { msg_id: 53, read_ct: 1, message: { user_id: USER_ID, message: 'Reminder text' } },
          ],
          [],
        ],
        subscriptions: [
          {
            id: '33333333-3333-4333-8333-333333333333',
            endpoint: 'https://push.example/expired',
            auth_key: 'auth-key',
            p256dh_key: 'p256dh-key',
          },
        ],
      });
      try {
        const response = await handleCronProcessPushReminders(buildRequest(), () =>
          Promise.reject(Object.assign(new Error('Subscription expired'), { statusCode: 410 })),
        );
        assertEquals(response.status, 200);
        assertEquals(await response.json(), { success: true, processed: 2 });
        assertEquals(fetchMock.archivedIds, [52, 53]);
        assertEquals(fetchMock.deletedSubscriptionIds, ['33333333-3333-4333-8333-333333333333']);
      } finally {
        fetchMock.restore();
      }
    });
  },
);
