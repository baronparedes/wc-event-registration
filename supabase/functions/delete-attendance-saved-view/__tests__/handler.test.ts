import { assertEquals } from '@std/assert';

import { handleDeleteAttendanceSavedView } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const VIEW_ID = '11111111-1111-4111-8111-111111111111';

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
  return new Request('https://example.functions/delete-attendance-saved-view', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { role?: string; deleteError?: boolean }) {
  const originalFetch = globalThis.fetch;
  const userId = crypto.randomUUID();
  const deletions: URL[] = [];
  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: userId }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: options.role ?? 'admin' }));
    }
    if (requestUrl.pathname === '/rest/v1/attendance_saved_views' && init?.method === 'DELETE') {
      deletions.push(requestUrl);
      if (options.deleteError) {
        return Promise.resolve(Response.json({ message: 'delete failed' }, { status: 500 }));
      }
      return Promise.resolve(new Response(null, { status: 204 }));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };
  return {
    deletions,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'delete-attendance-saved-view validates the UUID and requires an authorized role',
  async () => {
    await withFunctionEnv(async () => {
      const invalid = await handleDeleteAttendanceSavedView(buildRequest({ id: 'bad' }));
      const unauthorized = await handleDeleteAttendanceSavedView(
        buildRequest({ id: VIEW_ID }, false),
      );
      const slodMock = mockFetch({ role: 'slod' });
      try {
        const slodResponse = await handleDeleteAttendanceSavedView(buildRequest({ id: VIEW_ID }));
        assertEquals(invalid.status, 400);
        assertEquals(unauthorized.status, 401);
        assertEquals(slodResponse.status, 401);
      } finally {
        slodMock.restore();
      }
    });
  },
);

Deno.test('delete-attendance-saved-view deletes only the requested view', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleDeleteAttendanceSavedView(buildRequest({ id: VIEW_ID }));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true });
      assertEquals(fetchMock.deletions[0].searchParams.get('id'), `eq.${VIEW_ID}`);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('delete-attendance-saved-view maps database failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ deleteError: true });
    try {
      const response = await handleDeleteAttendanceSavedView(buildRequest({ id: VIEW_ID }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to delete view');
    } finally {
      fetchMock.restore();
    }
  });
});
