import { assertEquals } from '@std/assert';

import { handleGetPublicForm } from '../handler.ts';

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
  return new Request('https://example.functions/get-public-form', {
    method: 'POST',
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { form?: unknown; error?: boolean }) {
  const originalFetch = globalThis.fetch;
  const requestedUrls: URL[] = [];
  globalThis.fetch = (input) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    requestedUrls.push(requestUrl);
    if (requestUrl.pathname === '/rest/v1/forms') {
      if (options.error) {
        return Promise.resolve(Response.json({ message: 'form lookup failed' }, { status: 500 }));
      }
      return Promise.resolve(
        Response.json(options.form === undefined ? { id: 'form-1' } : options.form),
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

Deno.test('get-public-form validates the slug', async () => {
  await withFunctionEnv(async () => {
    const response = await handleGetPublicForm(buildRequest({ slug: '  ' }));
    assertEquals(response.status, 400);
  });
});

Deno.test('get-public-form returns the published form or null when unavailable', async () => {
  await withFunctionEnv(async () => {
    const form = { id: 'form-1', slug: 'member-survey', title: 'Member Survey' };
    const foundMock = mockFetch({ form });
    try {
      const response = await handleGetPublicForm(buildRequest({ slug: 'member-survey' }));
      assertEquals(await response.json(), { success: true, form });
      assertEquals(foundMock.requestedUrls[0].searchParams.get('status'), 'eq.published');
    } finally {
      foundMock.restore();
    }

    const missingMock = mockFetch({ form: null });
    try {
      const response = await handleGetPublicForm(buildRequest({ slug: 'draft-survey' }));
      assertEquals(await response.json(), { success: true, form: null });
    } finally {
      missingMock.restore();
    }
  });
});

Deno.test('get-public-form maps query errors to a server error', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({ error: true });
    try {
      const response = await handleGetPublicForm(buildRequest({ slug: 'member-survey' }));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to fetch form');
    } finally {
      fetchMock.restore();
    }
  });
});
