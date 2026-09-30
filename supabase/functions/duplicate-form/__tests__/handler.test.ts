import { assertEquals } from '@std/assert';

import { handleDuplicateForm } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const SOURCE_FORM_ID = '11111111-1111-4111-8111-111111111111';
const NEW_FORM_ID = '22222222-2222-4222-8222-222222222222';

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
  return new Request('https://example.functions/duplicate-form', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { rpcData?: unknown; rpcError?: { message: string; code: string } }) {
  const originalFetch = globalThis.fetch;
  const adminUserId = crypto.randomUUID();
  const rpcCalls: Array<{ functionName: string; body: unknown }> = [];

  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: adminUserId }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row', role: 'admin' }));
    }
    if (requestUrl.pathname === '/rest/v1/rpc/duplicate_form') {
      rpcCalls.push({ functionName: 'duplicate_form', body: JSON.parse(String(init?.body)) });
      if (options.rpcError) {
        return Promise.resolve(Response.json(options.rpcError, { status: 400 }));
      }
      const result = Object.hasOwn(options, 'rpcData') ? options.rpcData : NEW_FORM_ID;
      return Promise.resolve(Response.json(result));
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    adminUserId,
    rpcCalls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

const VALID_BODY = {
  source_form_id: SOURCE_FORM_ID,
  new_title: 'Copied form',
  new_slug: 'copied-form',
};

Deno.test('duplicate-form validates the request and requires an admin token', async () => {
  await withFunctionEnv(async () => {
    const invalid = await handleDuplicateForm(
      buildRequest({ ...VALID_BODY, new_slug: 'Bad Slug' }),
    );
    const unauthorized = await handleDuplicateForm(buildRequest(VALID_BODY, false));
    assertEquals(invalid.status, 400);
    assertEquals(unauthorized.status, 401);
  });
});

Deno.test('duplicate-form calls the RPC and returns the new form ID', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({});
    try {
      const response = await handleDuplicateForm(buildRequest(VALID_BODY));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true, new_form_id: NEW_FORM_ID });
      assertEquals(fetchMock.rpcCalls, [
        {
          functionName: 'duplicate_form',
          body: {
            p_source_form_id: SOURCE_FORM_ID,
            p_new_title: 'Copied form',
            p_new_slug: 'copied-form',
            p_admin_auth_user_id: fetchMock.adminUserId,
          },
        },
      ]);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('duplicate-form maps duplicate slug errors to a client error', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      rpcError: { message: 'forms_slug_unique_idx violated', code: '23505' },
    });
    try {
      const response = await handleDuplicateForm(buildRequest(VALID_BODY));
      assertEquals(response.status, 400);
      assertEquals((await response.json()).error_code, 'DUPLICATE_SLUG');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('duplicate-form maps a missing source form to not found', async () => {
  await withFunctionEnv(async () => {
    const fetchMock = mockFetch({
      rpcError: { message: 'SOURCE_FORM_NOT_FOUND', code: 'P0002' },
    });
    try {
      const response = await handleDuplicateForm(buildRequest(VALID_BODY));
      assertEquals(response.status, 404);
      assertEquals((await response.json()).error, 'Source form not found');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('duplicate-form maps unexpected RPC errors and empty IDs to server errors', async () => {
  await withFunctionEnv(async () => {
    const errorMock = mockFetch({ rpcError: { message: 'Unexpected failure', code: 'XX000' } });
    try {
      const response = await handleDuplicateForm(buildRequest(VALID_BODY));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to duplicate form');
    } finally {
      errorMock.restore();
    }

    const emptyResultMock = mockFetch({ rpcData: null });
    try {
      const response = await handleDuplicateForm(buildRequest(VALID_BODY));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to create new form');
    } finally {
      emptyResultMock.restore();
    }
  });
});
