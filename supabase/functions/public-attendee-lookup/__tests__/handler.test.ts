import { assertEquals } from '@std/assert';

import { handlePublicAttendeeLookup } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const EVENT_ID = '11111111-1111-4111-8111-111111111111';
let requestNumber = 0;

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

function buildRequest(body: unknown) {
  return new Request('https://example.functions/public-attendee-lookup', {
    method: 'POST',
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

function payload() {
  return { email: 'attendee@example.com', event_slug: 'weekend-service' };
}

type FetchOptions = {
  event?: unknown;
  registration?: unknown;
  failPath?: string;
};

function mockFetch(options: FetchOptions = {}) {
  const originalFetch = globalThis.fetch;
  const calls: URL[] = [];
  globalThis.fetch = (input) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    calls.push(url);
    if (url.pathname === options.failPath) {
      return Promise.resolve(Response.json({ message: 'lookup failed' }, { status: 500 }));
    }
    if (url.pathname === '/rest/v1/events') {
      return Promise.resolve(
        Response.json(
          options.event === undefined ? { id: EVENT_ID, duplicate_policy: 'block' } : options.event,
        ),
      );
    }
    if (url.pathname === '/rest/v1/public_registrations') {
      return Promise.resolve(Response.json(options.registration ?? null));
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

Deno.test(
  'public-attendee-lookup rejects invalid input without querying the database',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch();
      try {
        const response = await handlePublicAttendeeLookup(
          buildRequest({ email: 'bad', event_slug: ' ' }),
        );
        assertEquals(response.status, 400);
        assertEquals((await response.json()).reason, 'validation_error');
        assertEquals(fetchMock.calls.length, 0);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('public-attendee-lookup reports missing events as not found', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ event: null });
    try {
      const response = await handlePublicAttendeeLookup(buildRequest(payload()));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: false, reason: 'not_found' });
      assertEquals(
        fetchMock.calls.map((url) => url.pathname),
        ['/rest/v1/events'],
      );
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'public-attendee-lookup skips existing-registration checks for multiple submissions',
  async () => {
    await withFunctionEnv(async () => {
      for (const policy of ['allow_multiple', 'allow_multiple_update']) {
        const fetchMock = mockFetch({ event: { id: EVENT_ID, duplicate_policy: policy } });
        try {
          const response = await handlePublicAttendeeLookup(buildRequest(payload()));
          assertEquals(response.status, 200);
          assertEquals(await response.json(), { success: true });
          assertEquals(fetchMock.calls.length, 1);
        } finally {
          fetchMock.restore();
        }
      }
    });
  },
);

Deno.test('public-attendee-lookup returns an existing blocked registration by email', async () => {
  await withFunctionEnv(async () => {
    const registration = {
      id: 'registration-1',
      status: 'submitted',
      submitted_at: '2026-09-30T09:00:00Z',
    };
    const fetchMock = mockFetch({ registration });
    try {
      const response = await handlePublicAttendeeLookup(buildRequest(payload()));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, existing_registration: registration });
      const query = fetchMock.calls.find((url) => url.pathname === '/rest/v1/public_registrations');
      assertEquals(query?.searchParams.get('event_id'), `eq.${EVENT_ID}`);
      assertEquals(query?.searchParams.get('email'), 'ilike.attendee@example.com');
      assertEquals(query?.searchParams.has('registration_scope_key'), false);
      assertEquals(query?.searchParams.get('limit'), '1');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('public-attendee-lookup uses the primary scope for update policies', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ event: { id: EVENT_ID, duplicate_policy: 'allow_update' } });
    try {
      const response = await handlePublicAttendeeLookup(buildRequest(payload()));
      assertEquals(await response.json(), { success: true });
      const query = fetchMock.calls.find((url) => url.pathname === '/rest/v1/public_registrations');
      assertEquals(query?.searchParams.get('registration_scope_key'), 'eq.primary');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('public-attendee-lookup maps event and registration lookup failures', async () => {
  await withFunctionEnv(async () => {
    for (const failPath of ['/rest/v1/events', '/rest/v1/public_registrations']) {
      const fetchMock = mockFetch({ failPath });
      try {
        const response = await handlePublicAttendeeLookup(buildRequest(payload()));
        assertEquals(response.status, 500);
        assertEquals((await response.json()).reason, 'internal_error');
      } finally {
        fetchMock.restore();
      }
    }
  });
});
