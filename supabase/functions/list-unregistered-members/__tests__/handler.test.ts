import { assertEquals } from '@std/assert';

import { handleListUnregisteredMembers } from '../handler.ts';

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

  return new Request('https://example.functions/list-unregistered-members', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: {
  rpcResult?: unknown;
  rpcError?: { code: string; message: string };
}) {
  const originalFetch = globalThis.fetch;
  const rpcCalls: Array<{ url: URL; body: string }> = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());

    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: ADMIN_USER_ID }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-record', role: 'admin' }));
    }
    if (url.pathname === '/rest/v1/rpc/list_unregistered_members') {
      const body = input instanceof Request ? await input.clone().text() : String(init?.body ?? '');
      rpcCalls.push({ url, body });
      if (options.rpcError) {
        return Response.json(options.rpcError, { status: 400 });
      }
      return Response.json(options.rpcResult ?? { items: [], total_count: 0 });
    }

    return new Response('Unexpected request', { status: 500 });
  };

  return {
    rpcCalls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'list-unregistered-members validates event IDs and requires admin authentication',
  async () => {
    await withFunctionEnv(async () => {
      const invalid = await handleListUnregisteredMembers(buildRequest({ event_id: 'bad' }));
      const unauthorized = await handleListUnregisteredMembers(
        buildRequest({ event_id: EVENT_ID }, false),
      );

      assertEquals(invalid.status, 400);
      assertEquals(unauthorized.status, 401);
    });
  },
);

Deno.test(
  'list-unregistered-members excludes active registrants and returns pagination metadata',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        rpcResult: {
          items: [
            {
              id: 'unregistered-user',
              member_id: 'M-001',
              full_name: null,
              email: null,
              role: ' Prayer Coach ',
              category: ' ',
            },
          ],
          total_count: 12,
        },
      });

      try {
        const response = await handleListUnregisteredMembers(
          buildRequest({
            event_id: EVENT_ID,
            page_size: 5,
            offset: 5,
            search_term: 'A,B_%',
          }),
        );

        assertEquals(response.status, 200);
        assertEquals(await response.json(), {
          success: true,
          items: [
            {
              user_id: 'unregistered-user',
              member_id: 'M-001',
              full_name: 'M-001',
              email: null,
              role: 'Prayer Coach',
              category: null,
            },
          ],
          total_count: 12,
          has_more: true,
          next_cursor: '10',
        });

        assertEquals(fetchMock.rpcCalls.length, 1);
        assertEquals(fetchMock.rpcCalls[0].url.pathname, '/rest/v1/rpc/list_unregistered_members');
        assertEquals(JSON.parse(fetchMock.rpcCalls[0].body), {
          p_event_id: EVENT_ID,
          p_page_size: 5,
          p_offset: 5,
          p_search_term: 'A,B_%',
        });
        assertEquals(fetchMock.rpcCalls[0].url.search, '');
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('list-unregistered-members reports RPC failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      rpcError: { code: 'XX000', message: 'query failed' },
    });

    try {
      const response = await handleListUnregisteredMembers(buildRequest({ event_id: EVENT_ID }));

      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to load unregistered members');
    } finally {
      fetchMock.restore();
    }
  });
});
