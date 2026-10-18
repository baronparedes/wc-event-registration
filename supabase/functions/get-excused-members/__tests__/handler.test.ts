import { assertEquals } from '@std/assert';

import { handleGetExcusedMembers } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';

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

let requestNumber = 0;

function buildRequest(body: unknown) {
  return new Request('https://example.functions/get-excused-members', {
    method: 'POST',
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
      authorization: 'Bearer admin-access-token',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { excuses?: unknown[]; queryError?: boolean }) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];

  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    requestedUrls.push(requestUrl);
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'slod' }));
    }
    if (requestUrl.pathname === '/rest/v1/service_excuse_sundays') {
      if (options.queryError) {
        return Promise.resolve(Response.json({ message: 'excuse lookup failed' }, { status: 500 }));
      }
      return Promise.resolve(Response.json(options.excuses ?? []));
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

Deno.test('get-excused-members validates year and month index', async () => {
  await withFunctionEnv(async () => {
    const response = await handleGetExcusedMembers(buildRequest({ year: 1999, monthIndex: 12 }));
    assertEquals(response.status, 400);
  });
});

Deno.test(
  'get-excused-members filters the requested month and normalizes answer values',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        excuses: [
          {
            excuse_id: 'excuse-1',
            user_id: 'user-1',
            member_id: 'M-001',
            sunday_date: '2026-02-08',
            services: ['9AM', '12NN'],
            services_str: '9AM, 12NN',
            reason: 'Family commitment',
            status: 'approved',
            is_long_leave: false,
          },
        ],
      });
      try {
        const response = await handleGetExcusedMembers(buildRequest({ year: 2026, monthIndex: 1 }));
        assertEquals(await response.json(), {
          success: true,
          records: [
            {
              userId: 'user-1',
              memberId: 'M-001',
              requestDate: '2026-02-08',
              services: '9AM, 12NN',
              reason: 'Family commitment',
              status: 'approved',
              isLongLeave: false,
            },
          ],
        });
        const query = fetchMock.requestedUrls.find(
          (url) => url.pathname === '/rest/v1/service_excuse_sundays',
        );
        assertEquals(query?.searchParams.get('sunday_date'), 'gte.2026-02-01');
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('get-excused-members returns an empty list when no requests match', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ excuses: [] });
    try {
      const response = await handleGetExcusedMembers(buildRequest({ year: 2026, monthIndex: 1 }));
      assertEquals(await response.json(), { success: true, records: [] });
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('get-excused-members maps query failures', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ queryError: true });
    try {
      const response = await handleGetExcusedMembers(buildRequest({ year: 2026, monthIndex: 1 }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to query matching excused requests');
    } finally {
      fetchMock.restore();
    }
  });
});
