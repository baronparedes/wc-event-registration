import { assertEquals, assertStringIncludes } from '@std/assert';

import { handleExportUnregisteredMembersCsv } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';

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
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/export-unregistered-members-csv', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { registrationsError?: boolean }) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];

  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    requestedUrls.push(requestUrl);
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'admin' }));
    }
    if (requestUrl.pathname === '/rest/v1/events') {
      return Promise.resolve(Response.json({ title: 'Summer Gathering' }));
    }
    if (requestUrl.pathname === '/rest/v1/registrations') {
      if (options.registrationsError) {
        return Promise.resolve(
          Response.json({ message: 'registration lookup failed' }, { status: 500 }),
        );
      }
      return Promise.resolve(
        Response.json([
          { user_id: 'registered-user' },
          { user_id: 'registered-user' },
          { user_id: '' },
        ]),
      );
    }
    if (requestUrl.pathname === '/rest/v1/users') {
      return Promise.resolve(
        Response.json([
          {
            id: 'unregistered-user',
            member_id: 'M-002',
            full_name: '  ',
            email: 'guest@example.com',
            role: '  volunteer  ',
            category: null,
          },
        ]),
      );
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    requestedUrls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'export-unregistered-members-csv validates event_id and requires an admin token',
  async () => {
    await withFunctionEnv(async () => {
      const invalid = await handleExportUnregisteredMembersCsv(buildRequest({ event_id: 'bad' }));
      const unauthorized = await handleExportUnregisteredMembersCsv(
        buildRequest({ event_id: EVENT_ID }, false),
      );
      assertEquals(invalid.status, 400);
      assertEquals(unauthorized.status, 401);
    });
  },
);

Deno.test(
  'export-unregistered-members-csv excludes active registrants and formats the CSV',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({});
      try {
        const response = await handleExportUnregisteredMembersCsv(
          buildRequest({ event_id: EVENT_ID }),
        );
        const csv = await response.text();
        assertEquals(response.status, 200);
        assertEquals(response.headers.get('content-type'), 'text/csv; charset=utf-8');
        assertStringIncludes(
          response.headers.get('content-disposition') ?? '',
          'summer-gathering-unregistered-members-',
        );
        assertEquals(csv.split('\n')[0], 'Member ID,Full Name,Email,Role,Category');
        assertEquals(csv.split('\n')[1], 'M-002,M-002,guest@example.com,volunteer,');
        const usersUrl = fetchMock.requestedUrls.find((url) => url.pathname === '/rest/v1/users');
        assertEquals(usersUrl?.searchParams.get('id'), 'not.in.("registered-user")');
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('export-unregistered-members-csv reports registration query failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ registrationsError: true });
    try {
      const response = await handleExportUnregisteredMembersCsv(
        buildRequest({ event_id: EVENT_ID }),
      );
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to load event registrations');
      assertEquals(
        fetchMock.requestedUrls.some((url) => url.pathname === '/rest/v1/users'),
        false,
      );
    } finally {
      fetchMock.restore();
    }
  });
});
