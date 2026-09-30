import { assertEquals } from '@std/assert';

import { handleCreateMember } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const MEMBER_ID = 'MEM-100';

const VALID_BODY = {
  member_id: MEMBER_ID,
  first_name: '  Alex ',
  last_name: ' Member  ',
  nickname: '  AJ  ',
  email: ' alex@example.com ',
  phone: '   ',
  date_of_birth: null,
  role: ' attendee ',
  category: ' member ',
};

async function withFunctionEnv(run: () => Promise<void>) {
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);
  try {
    await run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function buildRequest(body: unknown, authenticated = true) {
  const headers = new Headers({ origin: TEST_ORIGIN, 'content-type': 'application/json' });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/create-member', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { member?: unknown; insertError?: { code: string; message: string } }) {
  const originalFetch = globalThis.fetch;
  const insertedRows: unknown[] = [];

  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'admin' }));
    }
    if (requestUrl.pathname === '/rest/v1/users' && init?.method === 'POST') {
      insertedRows.push(JSON.parse(String(init.body)) as unknown);
      if (options.insertError) {
        return Promise.resolve(Response.json(options.insertError, { status: 409 }));
      }
      const member = Object.hasOwn(options, 'member')
        ? options.member
        : {
            id: 'member-user-id',
            member_id: MEMBER_ID,
            full_name: 'Alex Member',
          };
      return Promise.resolve(Response.json(member));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    insertedRows,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('create-member validates required fields and requires admin authentication', async () => {
  await withFunctionEnv(async () => {
    const invalid = await handleCreateMember(buildRequest({ ...VALID_BODY, first_name: ' ' }));
    const unauthorized = await handleCreateMember(buildRequest(VALID_BODY, false));
    assertEquals(invalid.status, 400);
    assertEquals(unauthorized.status, 401);
  });
});

Deno.test('create-member trims fields and normalizes blank optionals to null', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleCreateMember(buildRequest(VALID_BODY));
      assertEquals(response.status, 201);
      assertEquals(await response.json(), {
        success: true,
        id: 'member-user-id',
        member_id: MEMBER_ID,
        full_name: 'Alex Member',
      });
      assertEquals(fetchMock.insertedRows, [
        {
          member_id: MEMBER_ID,
          full_name: 'Alex Member',
          first_name: 'Alex',
          last_name: 'Member',
          nickname: 'AJ',
          email: 'alex@example.com',
          phone: null,
          date_of_birth: null,
          role: 'attendee',
          category: 'member',
        },
      ]);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('create-member maps duplicate member IDs to conflict', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      insertError: { code: '23505', message: 'duplicate key value violates unique constraint' },
    });
    try {
      const response = await handleCreateMember(buildRequest(VALID_BODY));
      assertEquals(response.status, 409);
      assertEquals((await response.json()).error_code, 'MEMBER_ID_DUPLICATE');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('create-member returns insertion and retrieval failures', async () => {
  await withFunctionEnv(async () => {
    const insertErrorMock = mockFetch({
      insertError: { code: 'XX000', message: 'database unavailable' },
    });
    try {
      const response = await handleCreateMember(buildRequest(VALID_BODY));
      assertEquals(response.status, 400);
      assertEquals((await response.json()).error, 'database unavailable');
    } finally {
      insertErrorMock.restore();
    }

    const noRowMock = mockFetch({ member: null });
    try {
      const response = await handleCreateMember(buildRequest(VALID_BODY));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error_code, 'RETRIEVE_FAILED');
    } finally {
      noRowMock.restore();
    }
  });
});
