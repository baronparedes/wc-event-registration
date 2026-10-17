import { assertEquals } from '@std/assert';

import { handleGetMemberExcusedSchedule } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const MEMBER_USER_ID = '22222222-2222-4222-8222-222222222222';
const OTHER_USER_ID = '33333333-3333-4333-8333-333333333333';

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

function buildRequest(body: unknown, authenticated = true) {
  const headers = new Headers({
    origin: TEST_ORIGIN,
    'content-type': 'application/json',
    'x-forwarded-for': `203.0.113.${++requestNumber}`,
  });
  if (authenticated) headers.set('authorization', 'Bearer member-access-token');
  return new Request('https://example.functions/get-member-excused-schedule', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { adminRole?: string; excuses?: unknown[]; queryError?: boolean }) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];
  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    requestedUrls.push(requestUrl);
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: MEMBER_USER_ID }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: options.adminRole ?? 'slod' }));
    }
    if (requestUrl.pathname === '/rest/v1/service_excuse_requests') {
      if (options.queryError) {
        return Promise.resolve(Response.json({ message: 'lookup failed' }, { status: 500 }));
      }
      return Promise.resolve(
        Response.json(
          options.excuses ?? [
            {
              id: 'excuse-1',
              user_id: MEMBER_USER_ID,
              member_id: 'M-003',
              request_date: '2026-03-08',
              services: [],
              reason: 'Service commitment',
            },
          ],
        ),
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

Deno.test('get-member-excused-schedule validates input and requires authentication', async () => {
  await withFunctionEnv(async () => {
    const invalid = await handleGetMemberExcusedSchedule(
      buildRequest({ year: 1999, monthIndex: 0 }),
    );
    const unauthorized = await handleGetMemberExcusedSchedule(
      buildRequest({ year: 2026, monthIndex: 2 }, false),
    );
    assertEquals(invalid.status, 400);
    assertEquals(unauthorized.status, 401);
  });
});

Deno.test(
  'get-member-excused-schedule returns only the authenticated member schedule',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({});
      try {
        const response = await handleGetMemberExcusedSchedule(
          buildRequest({ year: 2026, monthIndex: 2 }),
        );
        assertEquals(await response.json(), {
          success: true,
          records: [
            {
              userId: MEMBER_USER_ID,
              memberId: 'M-003',
              requestDate: '2026-03-08',
              services: '',
              reason: 'Service commitment',
            },
          ],
        });
        const query = fetchMock.requestedUrls.find(
          (url) => url.pathname === '/rest/v1/service_excuse_requests',
        );
        assertEquals(query?.searchParams.get('user_id'), `eq.${MEMBER_USER_ID}`);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'get-member-excused-schedule permits allowed admins to request another member',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({
        adminRole: 'imt',
        excuses: [
          {
            id: 'excuse-2',
            user_id: OTHER_USER_ID,
            member_id: 'M-004',
            request_date: '2026-03-15',
            services: ['9AM'],
            reason: 'Travel',
          },
        ],
      });
      try {
        const response = await handleGetMemberExcusedSchedule(
          buildRequest({ year: 2026, monthIndex: 2, userId: OTHER_USER_ID }),
        );
        assertEquals(response.status, 200);
        const query = fetchMock.requestedUrls.find(
          (url) => url.pathname === '/rest/v1/service_excuse_requests',
        );
        assertEquals(query?.searchParams.get('user_id'), `eq.${OTHER_USER_ID}`);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('get-member-excused-schedule denies cross-user reads for non-admin roles', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ adminRole: 'kiosk' });
    try {
      const response = await handleGetMemberExcusedSchedule(
        buildRequest({ year: 2026, monthIndex: 2, userId: OTHER_USER_ID }),
      );
      assertEquals(response.status, 403);
      assertEquals(
        fetchMock.requestedUrls.some((url) => url.pathname === '/rest/v1/service_excuse_requests'),
        false,
      );
    } finally {
      fetchMock.restore();
    }
  });
});
