import { assertEquals } from '@std/assert';

import { handleManagePushSubscription } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const ENDPOINT = 'https://push.example/subscription/abc';

async function withFunctionEnv(run: () => Promise<void>) {
  const envNames = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
  const previousValues = new Map(envNames.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);

  try {
    await run();
  } finally {
    for (const [name, value] of previousValues) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function buildRequest(body: unknown, authenticated = true) {
  const headers = new Headers({ origin: TEST_ORIGIN, 'content-type': 'application/json' });
  if (authenticated) headers.set('authorization', 'Bearer member-access-token');
  return new Request('https://example.functions/manage-push-subscription', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { writeError?: boolean }) {
  const originalFetch = globalThis.fetch;
  const userId = crypto.randomUUID();
  const writes: Array<{ method: string; body?: unknown; url: URL }> = [];

  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: userId }));
    }
    if (requestUrl.pathname === '/rest/v1/user_push_subscriptions') {
      const method = init?.method ?? 'GET';
      writes.push({
        method,
        url: requestUrl,
        ...(init?.body ? { body: JSON.parse(String(init.body)) as unknown } : {}),
      });
      if (options.writeError) {
        return Promise.resolve(
          Response.json({ message: 'subscription write failed' }, { status: 500 }),
        );
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    userId,
    writes,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'manage-push-subscription requires authentication and validates subscription data',
  async () => {
    await withFunctionEnv(async () => {
      const unauthorized = await handleManagePushSubscription(
        buildRequest({ action: 'subscribe' }, false),
      );
      const invalid = await handleManagePushSubscription(
        buildRequest({ action: 'subscribe', subscription: { endpoint: 'bad', keys: {} } }),
      );
      assertEquals(unauthorized.status, 401);
      assertEquals(invalid.status, 400);
    });
  },
);

Deno.test('manage-push-subscription stores endpoint keys for the authenticated user', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleManagePushSubscription(
        buildRequest({
          action: 'subscribe',
          subscription: {
            endpoint: ENDPOINT,
            keys: { p256dh: 'public-key', auth: 'auth-secret' },
          },
        }),
      );
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true });
      assertEquals(fetchMock.writes[0].method, 'POST');
      assertEquals(fetchMock.writes[0].url.searchParams.get('on_conflict'), 'endpoint');
      assertEquals(fetchMock.writes[0].body, {
        user_id: fetchMock.userId,
        endpoint: ENDPOINT,
        p256dh_key: 'public-key',
        auth_key: 'auth-secret',
      });
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('manage-push-subscription deletes only the authenticated user subscription', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleManagePushSubscription(
        buildRequest({
          action: 'unsubscribe',
          subscription: { endpoint: ENDPOINT, keys: { p256dh: 'public-key', auth: 'auth-secret' } },
        }),
      );
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true });
      assertEquals(fetchMock.writes[0].method, 'DELETE');
      assertEquals(fetchMock.writes[0].url.searchParams.get('endpoint'), `eq.${ENDPOINT}`);
      assertEquals(fetchMock.writes[0].url.searchParams.get('user_id'), `eq.${fetchMock.userId}`);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('manage-push-subscription reports subscription storage failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ writeError: true });
    try {
      const response = await handleManagePushSubscription(
        buildRequest({
          action: 'subscribe',
          subscription: { endpoint: ENDPOINT, keys: { p256dh: 'public-key', auth: 'auth-secret' } },
        }),
      );
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Internal server error');
    } finally {
      fetchMock.restore();
    }
  });
});
