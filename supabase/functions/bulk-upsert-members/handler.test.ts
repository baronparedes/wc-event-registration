import { assertEquals } from '@std/assert';

import { handleBulkUpsertMembers } from './handler.ts';

const TEST_ORIGIN = 'https://app.example.com';

async function withFunctionEnv(run: () => Promise<void>) {
  const previousUrl = Deno.env.get('SUPABASE_URL');
  const previousServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const previousAllowedOrigins = Deno.env.get('ALLOWED_ORIGINS');

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', TEST_ORIGIN);

  try {
    await run();
  } finally {
    if (previousUrl === undefined) {
      Deno.env.delete('SUPABASE_URL');
    } else {
      Deno.env.set('SUPABASE_URL', previousUrl);
    }

    if (previousServiceRoleKey === undefined) {
      Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
    } else {
      Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', previousServiceRoleKey);
    }

    if (previousAllowedOrigins === undefined) {
      Deno.env.delete('ALLOWED_ORIGINS');
    } else {
      Deno.env.set('ALLOWED_ORIGINS', previousAllowedOrigins);
    }
  }
}

function buildRequest(body: unknown) {
  return new Request('https://example.functions/bulk-upsert-members', {
    method: 'POST',
    headers: {
      origin: TEST_ORIGIN,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function validRow() {
  return {
    row_number: 2,
    member_id: 'member-002',
    first_name: 'Test',
    last_name: 'Member',
    nickname: 'Sample',
    email: null,
    phone: null,
    date_of_birth: null,
    role: 'Attendee',
    category: 'Participant',
  };
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve(Response.json(body));
}

Deno.test('bulk-upsert-members rejects invalid row data before admin authorization', async () => {
  await withFunctionEnv(async () => {
    const response = await handleBulkUpsertMembers(
      buildRequest({ rows: [{ ...validRow(), category: '' }] }),
    );

    assertEquals(response.status, 400);
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), TEST_ORIGIN);
    assertEquals(response.headers.get('Content-Type'), 'application/json');
  });
});

Deno.test('bulk-upsert-members rejects a valid request without an admin bearer token', async () => {
  await withFunctionEnv(async () => {
    const response = await handleBulkUpsertMembers(buildRequest({ rows: [validRow()] }));

    assertEquals(response.status, 401);
    assertEquals(await response.json(), {
      success: false,
      error: 'Unauthorized',
      error_code: 'UNAUTHORIZED',
    });
  });
});

Deno.test('bulk-upsert-members sends resolved role and category to the upsert RPC', async () => {
  await withFunctionEnv(async () => {
    const originalFetch = globalThis.fetch;
    let rpcRows: unknown;

    globalThis.fetch = (input, init) => {
      const requestUrl = new URL(input instanceof Request ? input.url : input.toString());

      if (requestUrl.pathname === '/auth/v1/user') {
        return jsonResponse({ id: 'admin-user' });
      }

      if (requestUrl.pathname === '/rest/v1/admins') {
        return jsonResponse({ id: 'admin-record', role: 'admin' });
      }

      if (requestUrl.pathname === '/rest/v1/users') {
        return jsonResponse([]);
      }

      if (requestUrl.pathname === '/rest/v1/rpc/apply_bulk_member_upsert') {
        const body = JSON.parse(String(init?.body)) as { p_rows: unknown[] };
        rpcRows = body.p_rows;
        return jsonResponse([{ inserted_count: 1, updated_count: 0 }]);
      }

      return Promise.resolve(new Response('Unexpected request', { status: 500 }));
    };

    try {
      const response = await handleBulkUpsertMembers(
        new Request('https://example.functions/bulk-upsert-members', {
          method: 'POST',
          headers: {
            origin: TEST_ORIGIN,
            'content-type': 'application/json',
            authorization: 'Bearer admin-access-token',
          },
          body: JSON.stringify({
            rows: [
              {
                ...validRow(),
                role: 'Prayer Coach',
                category: 'Ladies',
                metadata: { sr_pwd: false },
              },
            ],
          }),
        }),
      );

      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        inserted_count: 1,
        updated_count: 0,
        imported_count: 1,
      });
      assertEquals(rpcRows, [
        {
          operation: 'insert',
          member_id: 'member-002',
          first_name: 'Test',
          last_name: 'Member',
          nickname: 'Sample',
          email: null,
          phone: null,
          date_of_birth: null,
          role: 'Prayer Coach',
          category: 'Ladies',
          metadata: { sr_pwd: false },
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
