import { assertEquals } from '@std/assert';

import { handleListAttendeesV2 } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_USER_ID = '22222222-2222-4222-8222-222222222222';

async function withFunctionEnv(run: () => Promise<void>) {
  const previousValues = new Map<string, string | undefined>(
    ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'].map((name) => [
      name,
      Deno.env.get(name),
    ]),
  );
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
  const headers = new Headers({
    origin: TEST_ORIGIN,
    'content-type': 'application/json',
  });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');

  return new Request('https://example.functions/list-attendees-v2', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(rpcResponse: { body: unknown; status?: number }) {
  const originalFetch = globalThis.fetch;
  const rpcCalls: Array<{ url: URL; body: string }> = [];

  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: ADMIN_USER_ID }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-record', role: 'slod' }));
    }
    if (url.pathname === '/rest/v1/rpc/list_event_attendees_v2') {
      rpcCalls.push({ url, body: String(init?.body) });
      return Promise.resolve(
        Response.json(rpcResponse.body, { status: rpcResponse.status ?? 200 }),
      );
    }

    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    rpcCalls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('list-attendees-v2 rejects invalid event IDs and unauthenticated requests', async () => {
  await withFunctionEnv(async () => {
    const invalid = await handleListAttendeesV2(buildRequest({ event_id: 'bad' }));
    const unauthorized = await handleListAttendeesV2(buildRequest({ event_id: EVENT_ID }, false));

    assertEquals(invalid.status, 400);
    assertEquals(unauthorized.status, 401);
  });
});

Deno.test('list-attendees-v2 calls its RPC and returns attendee rows including phone', async () => {
  await withFunctionEnv(async () => {
    const results = [
      {
        registration_id: 'registration-1',
        public_registration_id: null,
        attendee_kind: 'registered',
        full_name: 'Test Member',
        email: 'member@example.com',
        phone: '09171234567',
      },
      {
        registration_id: 'public-1',
        public_registration_id: 'public-1',
        attendee_kind: 'public',
        full_name: 'Test Public',
        email: 'public@example.com',
        phone: '09187654321',
      },
    ];
    const fetchMock = mockFetch({ body: { attendance_enabled: true, results } });

    try {
      const response = await handleListAttendeesV2(buildRequest({ event_id: EVENT_ID }));

      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, results });
      assertEquals(fetchMock.rpcCalls.length, 1);
      assertEquals(fetchMock.rpcCalls[0].url.pathname, '/rest/v1/rpc/list_event_attendees_v2');
      assertEquals(JSON.parse(fetchMock.rpcCalls[0].body), { p_event_id: EVENT_ID });
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('list-attendees-v2 returns disabled when attendance is off', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ body: { attendance_enabled: false, results: [] } });

    try {
      const response = await handleListAttendeesV2(buildRequest({ event_id: EVENT_ID }));

      assertEquals(response.status, 400);
      assertEquals((await response.json()).error_code, 'ATTENDANCE_DISABLED');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('list-attendees-v2 maps RPC failures to a server error', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      body: { code: 'P0001', message: 'RPC failed' },
      status: 400,
    });

    try {
      const response = await handleListAttendeesV2(buildRequest({ event_id: EVENT_ID }));

      assertEquals(response.status, 500);
      assertEquals((await response.json()).error_code, 'ATTENDEE_DETAILS_LOOKUP_FAILED');
    } finally {
      fetchMock.restore();
    }
  });
});
