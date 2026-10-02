import { assertEquals } from '@std/assert';

import { handleUpdateMemberId } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const USER_ID = '11111111-1111-4111-8111-111111111111';

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
  return new Request('https://example.functions/update-member-id', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: {
  updatedMember?: unknown;
  updateError?: { code: string; message: string };
}) {
  const originalFetch = globalThis.fetch;
  const updates: Array<{ body: unknown; url: URL }> = [];
  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'admin' }));
    }
    if (requestUrl.pathname === '/rest/v1/users' && init?.method === 'PATCH') {
      updates.push({ body: JSON.parse(String(init.body)) as unknown, url: requestUrl });
      if (options.updateError) {
        return Promise.resolve(Response.json(options.updateError, { status: 409 }));
      }
      const member = Object.hasOwn(options, 'updatedMember')
        ? options.updatedMember
        : { id: USER_ID, member_id: '1747949638' };
      return Promise.resolve(Response.json(member));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };
  return {
    updates,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('update-member-id validates input and requires admin authentication', async () => {
  await withFunctionEnv(async () => {
    const invalid = await handleUpdateMemberId(buildRequest({ id: 'bad', member_id: ' ' }));
    const unauthorized = await handleUpdateMemberId(
      buildRequest({ id: USER_ID, member_id: 'MEM-001' }, false),
    );
    assertEquals(invalid.status, 400);
    assertEquals(unauthorized.status, 401);
  });
});

Deno.test('update-member-id trims and converts an RFID hex input', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleUpdateMemberId(
        buildRequest({ id: USER_ID, member_id: '  46 6C 21 69  ' }),
      );
      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        id: USER_ID,
        member_id: '1747949638',
      });
      assertEquals(fetchMock.updates[0].body, { member_id: '1763798086' });
      assertEquals(fetchMock.updates[0].url.searchParams.get('id'), `eq.${USER_ID}`);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('update-member-id maps duplicate IDs and database errors', async () => {
  await withFunctionEnv(async () => {
    const duplicateMock = mockFetch({
      updateError: { code: '23505', message: 'duplicate member ID' },
    });
    try {
      const response = await handleUpdateMemberId(buildRequest({ id: USER_ID, member_id: 'M-2' }));
      assertEquals(response.status, 409);
      assertEquals((await response.json()).error_code, 'MEMBER_ID_EXISTS');
    } finally {
      duplicateMock.restore();
    }

    const errorMock = mockFetch({
      updateError: { code: 'XX000', message: 'database unavailable' },
    });
    try {
      const response = await handleUpdateMemberId(buildRequest({ id: USER_ID, member_id: 'M-2' }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Internal server error');
    } finally {
      errorMock.restore();
    }
  });
});

Deno.test('update-member-id returns not found when no row is returned', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ updatedMember: null });
    try {
      const response = await handleUpdateMemberId(buildRequest({ id: USER_ID, member_id: 'M-2' }));
      assertEquals(response.status, 404);
      assertEquals((await response.json()).error_code, 'MEMBER_NOT_FOUND');
    } finally {
      fetchMock.restore();
    }
  });
});
