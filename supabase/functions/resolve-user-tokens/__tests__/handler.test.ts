import { assertEquals } from '@std/assert';

import { handleResolveUserTokens } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const USER_ID = '11111111-1111-4111-8111-111111111111';

async function withEnv(run: () => Promise<void>) {
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', ORIGIN);
  try {
    await run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function request(body: unknown, authenticated = true) {
  const headers = new Headers({ origin: ORIGIN, 'content-type': 'application/json' });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/resolve-user-tokens', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

type TokenRow = { token: string; user_id: string; users: unknown };

function mockFetch(rows: TokenRow[], options: { role?: string; queryError?: boolean } = {}) {
  const originalFetch = globalThis.fetch;
  const queries: URL[] = [];
  globalThis.fetch = (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    if (url.pathname === '/auth/v1/user') return Promise.resolve(Response.json({ id: USER_ID }));
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: options.role ?? 'slod' }));
    }
    if (url.pathname === '/rest/v1/user_tokens') {
      queries.push(url);
      return Promise.resolve(
        options.queryError
          ? Response.json({ message: 'lookup failed' }, { status: 500 })
          : Response.json(rows),
      );
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };
  return {
    queries,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('resolve-user-tokens validates input and restricts access', async () => {
  await withEnv(async () => {
    assertEquals((await handleResolveUserTokens(request({ tokens: 'wrong' }))).status, 400);
    assertEquals((await handleResolveUserTokens(request({}, false))).status, 401);
    const fetchMock = mockFetch([], { role: 'kiosk' });
    try {
      assertEquals((await handleResolveUserTokens(request({}))).status, 401);
      assertEquals(fetchMock.queries.length, 0);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('resolve-user-tokens filters tokens and maps names and avatars', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch([
      {
        token: 'one',
        user_id: USER_ID,
        users: {
          nickname: 'Jo',
          first_name: 'John',
          full_name: 'John Smith',
          last_name: 'Smith',
          avatar_object_key: 'avatars/jo.jpg',
        },
      },
      {
        token: 'two',
        user_id: USER_ID,
        users: [
          {
            nickname: null,
            first_name: 'Alex',
            full_name: 'Alex Smith',
            last_name: 'Smith',
            avatar_object_key: null,
          },
        ],
      },
      { token: 'three', user_id: USER_ID, users: null },
    ]);
    try {
      const response = await handleResolveUserTokens(request({ tokens: ['one', 'two', 'three'] }));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        data: {
          one: {
            id: USER_ID,
            name: 'Jo',
            avatarObjectKey: 'avatars/jo.jpg',
            fullName: 'John Smith',
            firstName: 'John',
            lastName: 'Smith',
            nickname: 'Jo',
          },
          two: {
            id: USER_ID,
            name: 'Alex',
            avatarObjectKey: null,
            fullName: 'Alex Smith',
            firstName: 'Alex',
            lastName: 'Smith',
            nickname: null,
          },
          three: {
            id: USER_ID,
            name: 'three',
            avatarObjectKey: null,
            fullName: null,
            firstName: null,
            lastName: null,
            nickname: null,
          },
        },
      });
      assertEquals(fetchMock.queries[0].searchParams.get('token'), 'in.(one,two,three)');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('resolve-user-tokens permits an empty filter and reports lookup failures', async () => {
  await withEnv(async () => {
    const empty = mockFetch([]);
    try {
      const response = await handleResolveUserTokens(request({ tokens: [] }));
      assertEquals(await response.json(), { success: true, data: {} });
      assertEquals(empty.queries[0].searchParams.has('token'), false);
    } finally {
      empty.restore();
    }
    const failed = mockFetch([], { queryError: true });
    try {
      const response = await handleResolveUserTokens(request({ tokens: ['one'] }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to fetch user tokens');
    } finally {
      failed.restore();
    }
  });
});
