import { assertEquals } from '@std/assert';

import { handleGetPublicEvent } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';

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

let requestNumber = 0;

function buildRequest(body: unknown) {
  return new Request('https://example.functions/get-public-event', {
    method: 'POST',
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

function mockFetch(options: {
  event?: Record<string, unknown> | null;
  eventError?: boolean;
  count?: unknown;
}) {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    calls.push(requestUrl.pathname);
    if (requestUrl.pathname === '/rest/v1/events') {
      if (options.eventError) {
        return Promise.resolve(Response.json({ message: 'event query failed' }, { status: 500 }));
      }
      return Promise.resolve(Response.json(options.event ?? null));
    }
    if (requestUrl.pathname === '/rest/v1/rpc/get_total_event_registration_count') {
      return Promise.resolve(Response.json(options.count ?? 0));
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

Deno.test('get-public-event validates the slug', async () => {
  await withFunctionEnv(async () => {
    const response = await handleGetPublicEvent(buildRequest({ slug: '   ' }));
    assertEquals(response.status, 400);
  });
});

Deno.test('get-public-event returns null and zero for a missing published event', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ event: null });
    try {
      const response = await handleGetPublicEvent(buildRequest({ slug: 'not-published' }));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        event: null,
        registration_count: 0,
      });
      assertEquals(fetchMock.calls, ['/rest/v1/events']);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('get-public-event fetches the registration count for a published event', async () => {
  await withFunctionEnv(async () => {
    const event = { id: 'event-1', slug: 'community-day', title: 'Community Day' };
    const fetchMock = mockFetch({ event, count: 23 });
    try {
      const response = await handleGetPublicEvent(buildRequest({ slug: 'community-day' }));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        event,
        registration_count: 23,
      });
      assertEquals(fetchMock.calls, [
        '/rest/v1/events',
        '/rest/v1/rpc/get_total_event_registration_count',
      ]);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('get-public-event maps event query errors to a server error', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ eventError: true });
    try {
      const response = await handleGetPublicEvent(buildRequest({ slug: 'community-day' }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to fetch event');
    } finally {
      fetchMock.restore();
    }
  });
});
