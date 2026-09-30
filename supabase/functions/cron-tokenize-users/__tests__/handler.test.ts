import { assertEquals } from '@std/assert';

import { handleCronTokenizeUsers } from '../handler.ts';

const SERVICE_ROLE_KEY = 'test-service-role-key';
const TEST_ORIGIN = 'https://app.example.com';

async function withFunctionEnv(run: () => Promise<void>) {
  const previousValues = new Map<string, string | undefined>(
    ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'].map((name) => [
      name,
      Deno.env.get(name),
    ]),
  );

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
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

let requestNumber = 0;

function buildRequest(authorized = true) {
  const headers = new Headers({
    'content-type': 'application/json',
    origin: TEST_ORIGIN,
  });
  if (authorized) headers.set('authorization', `Bearer ${SERVICE_ROLE_KEY}`);
  headers.set('x-forwarded-for', `192.0.2.${++requestNumber}`);
  return new Request('https://example.functions/cron-tokenize-users', {
    method: 'POST',
    headers,
    body: '{}',
  });
}

function mockRpc(options: { result?: unknown; error?: { message: string; code: string } }) {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    calls.push(requestUrl.pathname);
    if (requestUrl.pathname === '/rest/v1/rpc/tokenize_all_users') {
      if (options.error) {
        return Promise.resolve(Response.json(options.error, { status: 500 }));
      }
      return Promise.resolve(Response.json(options.result ?? null));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('cron-tokenize-users requires an authorized caller', async () => {
  await withFunctionEnv(async () => {
    const response = await handleCronTokenizeUsers(buildRequest(false));
    assertEquals(response.status, 401);
  });
});

Deno.test('cron-tokenize-users returns the inserted count from the RPC', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockRpc({ result: 17 });
    try {
      const response = await handleCronTokenizeUsers(buildRequest());
      const body = await response.json();
      assertEquals(response.status, 200);
      assertEquals(body.success, true);
      assertEquals(body.inserted_count, 17);
      assertEquals(Number.isNaN(Date.parse(body.timestamp)), false);
      assertEquals(fetchMock.calls, ['/rest/v1/rpc/tokenize_all_users']);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('cron-tokenize-users normalizes a non-numeric RPC result to zero', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockRpc({ result: '17' });
    try {
      const response = await handleCronTokenizeUsers(buildRequest());
      assertEquals((await response.json()).inserted_count, 0);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('cron-tokenize-users returns an error when the RPC fails', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockRpc({ error: { message: 'RPC unavailable', code: 'XX000' } });
    try {
      const response = await handleCronTokenizeUsers(buildRequest());
      assertEquals(response.status, 500);
      assertEquals((await response.json()).detail, 'RPC unavailable');
    } finally {
      fetchMock.restore();
    }
  });
});
