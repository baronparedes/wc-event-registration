import { assertEquals } from '@std/assert';

import { handleSearchAttendees } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
let requestNumber = 0;

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
  const headers = new Headers({
    origin: ORIGIN,
    'content-type': 'application/json',
    'x-forwarded-for': `203.0.113.${++requestNumber}`,
  });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');
  return new Request('https://example.functions/search-attendees', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function payload(searchToken = 'Alex') {
  return { event_id: EVENT_ID, search_token: searchToken };
}

type FetchOptions = {
  settings?: unknown;
  registrations?: unknown[];
  publicRegistrations?: unknown[];
  checkIns?: unknown[];
  publicCheckIns?: unknown[];
  failPath?: string;
};

function mockFetch(options: FetchOptions = {}) {
  const originalFetch = globalThis.fetch;
  const calls: URL[] = [];
  globalThis.fetch = (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    calls.push(url);
    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: crypto.randomUUID() }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'admin' }));
    }
    if (url.pathname === options.failPath) {
      return Promise.resolve(Response.json({ message: 'lookup failed' }, { status: 500 }));
    }
    if (url.pathname === '/rest/v1/attendance_settings') {
      return Promise.resolve(
        Response.json(
          options.settings === undefined ? { attendance_enabled: true } : options.settings,
        ),
      );
    }
    if (url.pathname === '/rest/v1/registrations') {
      return Promise.resolve(Response.json(options.registrations ?? []));
    }
    if (url.pathname === '/rest/v1/public_registrations') {
      return Promise.resolve(Response.json(options.publicRegistrations ?? []));
    }
    if (url.pathname === '/rest/v1/attendance_check_ins') {
      return Promise.resolve(
        Response.json(
          url.searchParams.has('public_registration_id')
            ? (options.publicCheckIns ?? [])
            : (options.checkIns ?? []),
        ),
      );
    }
    if (url.pathname.startsWith('/rest/v1/')) return Promise.resolve(Response.json([]));
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('search-attendees validates input and requires admin authorization', async () => {
  await withEnv(async () => {
    assertEquals((await handleSearchAttendees(request(payload(' ')))).status, 400);
    assertEquals((await handleSearchAttendees(request(payload(), false))).status, 401);
  });
});

Deno.test(
  'search-attendees refuses disabled attendance without searching registrations',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch({ settings: { attendance_enabled: false } });
      try {
        const response = await handleSearchAttendees(request(payload()));
        assertEquals(response.status, 400);
        assertEquals((await response.json()).error_code, 'ATTENDANCE_DISABLED');
        assertEquals(
          fetchMock.calls.some((url) => url.pathname === '/rest/v1/registrations'),
          false,
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('search-attendees returns an empty result without detail queries', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch();
    try {
      const response = await handleSearchAttendees(request(payload()));
      assertEquals(await response.json(), { success: true, results: [] });
      assertEquals(
        fetchMock.calls.some((url) => url.pathname === '/rest/v1/attendance_check_ins'),
        false,
      );
      const memberQuery = fetchMock.calls.find((url) => url.pathname === '/rest/v1/registrations');
      assertEquals(memberQuery?.searchParams.get('status'), 'neq.cancelled');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('search-attendees combines member and public results with check-in state', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch({
      registrations: [
        {
          id: 'member-reg',
          user_id: 'user-1',
          status: 'submitted',
          submitted_at: '2026-09-30T08:00:00Z',
          users: {
            id: 'user-1',
            avatar_object_key: null,
            member_id: 'M-1',
            last_name: 'Smith',
            full_name: 'Alex Smith',
            email: 'alex@example.com',
            role: ' Usher ',
            category: null,
            nickname: 'Lex',
          },
        },
      ],
      publicRegistrations: [
        {
          id: 'public-reg',
          first_name: 'Alex',
          last_name: 'Jones',
          nickname: null,
          email: 'guest@example.com',
          status: 'submitted',
          submitted_at: '2026-09-30T09:00:00Z',
        },
      ],
      checkIns: [{ registration_id: 'member-reg', first_checked_in_at: '2026-09-30T10:00:00Z' }],
      publicCheckIns: [
        { public_registration_id: 'public-reg', first_checked_in_at: '2026-09-30T11:00:00Z' },
      ],
    });
    try {
      const response = await handleSearchAttendees(request(payload()));
      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(
        body.results.map((result: { attendee_kind: string; full_name: string }) => [
          result.attendee_kind,
          result.full_name,
        ]),
        [
          ['public', 'Alex Jones'],
          ['registered', 'Alex Smith'],
        ],
      );
      assertEquals(
        body.results.map((result: { check_in_status: string }) => result.check_in_status),
        ['checked_in', 'checked_in'],
      );
      assertEquals(body.results[0].member_id, 'Guest');
      assertEquals(body.results[1].role, 'Usher');
      assertEquals(body.results[1].registration_answers, []);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('search-attendees maps settings, registration, and detail query errors', async () => {
  await withEnv(async () => {
    for (const failPath of [
      '/rest/v1/attendance_settings',
      '/rest/v1/registrations',
      '/rest/v1/attendance_check_ins',
    ]) {
      const fetchMock = mockFetch({
        failPath,
        registrations: [
          {
            id: 'member-reg',
            user_id: 'user-1',
            status: 'submitted',
            submitted_at: '2026-09-30T08:00:00Z',
            users: {
              id: 'user-1',
              avatar_object_key: null,
              member_id: 'M-1',
              last_name: 'Smith',
              full_name: 'Alex Smith',
              email: null,
              role: null,
              category: null,
              nickname: null,
            },
          },
        ],
      });
      try {
        const response = await handleSearchAttendees(request(payload()));
        assertEquals(response.status, 500);
        assertEquals(
          (await response.json()).error_code,
          failPath.includes('settings')
            ? 'SETTINGS_LOOKUP_FAILED'
            : failPath.includes('check_ins')
              ? 'ATTENDEE_DETAILS_LOOKUP_FAILED'
              : 'REGISTRATION_SEARCH_FAILED',
        );
      } finally {
        fetchMock.restore();
      }
    }
  });
});
