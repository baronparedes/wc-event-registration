import { assertEquals } from '@std/assert';

import { handleGetPublicEventListing } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';

async function withFunctionEnv(run: () => Promise<void>) {
  const previousValues = new Map(
    ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'].map((name) => [
      name,
      Deno.env.get(name),
    ]),
  );
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

function buildRequest(body: unknown, method = 'POST') {
  return new Request('https://example.functions/get-public-event-listing', {
    method,
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify(body) }),
  });
}

function mockFetch(options: { events?: unknown[]; error?: boolean }) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];
  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    requestedUrls.push(requestUrl);
    if (requestUrl.pathname === '/rest/v1/events') {
      if (options.error) {
        return Promise.resolve(Response.json({ message: 'listing failed' }, { status: 500 }));
      }
      return Promise.resolve(Response.json(options.events ?? []));
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

Deno.test('get-public-event-listing rejects non-POST requests', async () => {
  await withFunctionEnv(async () => {
    const response = await handleGetPublicEventListing(buildRequest({}, 'GET'));
    assertEquals(response.status, 405);
  });
});

Deno.test('get-public-event-listing returns published events in start-time order', async () => {
  await withFunctionEnv(async () => {
    const events = [{ id: 'event-1', title: 'Community Day' }];
    const fetchMock = mockFetch({ events });
    try {
      const response = await handleGetPublicEventListing(buildRequest({}));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, events });
      assertEquals(fetchMock.requestedUrls[0].searchParams.get('status'), 'eq.published');
      assertEquals(fetchMock.requestedUrls[0].searchParams.get('order'), 'starts_at.asc');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('get-public-event-listing maps query errors to a server error', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ error: true });
    try {
      const response = await handleGetPublicEventListing(buildRequest({}));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to fetch event listing');
    } finally {
      fetchMock.restore();
    }
  });
});
