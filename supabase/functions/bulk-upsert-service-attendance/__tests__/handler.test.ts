import { assertEquals } from '@std/assert';

import { handleBulkUpsertServiceAttendance } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const LAYOUT_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';
const SEAT_ID = '33333333-3333-4333-8333-333333333333';

async function withFunctionEnv(run: () => Promise<void>) {
  const previousValues = new Map<string, string | undefined>(
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

function buildRequest(body: unknown, authenticated = false) {
  const headers = new Headers({
    origin: TEST_ORIGIN,
    'content-type': 'application/json',
  });
  if (authenticated) headers.set('authorization', 'Bearer admin-access-token');

  return new Request('https://example.functions/bulk-upsert-service-attendance', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function validPayload() {
  return {
    layout_id: LAYOUT_ID,
    rows: [
      {
        user_id: USER_ID,
        rfid: 'rfid-001',
        service_date: '2026-09-27',
        time_slot: '9AM',
        service_seat_id: SEAT_ID,
      },
    ],
  };
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve(Response.json(body));
}

Deno.test('bulk-upsert-service-attendance rejects invalid row fields', async () => {
  await withFunctionEnv(async () => {
    const response = await handleBulkUpsertServiceAttendance(
      buildRequest({
        ...validPayload(),
        rows: [{ ...validPayload().rows[0], service_date: '09/27/2026' }],
      }),
    );

    assertEquals(response.status, 400);
  });
});

Deno.test('bulk-upsert-service-attendance requires an admin bearer token', async () => {
  await withFunctionEnv(async () => {
    const response = await handleBulkUpsertServiceAttendance(buildRequest(validPayload()));

    assertEquals(response.status, 401);
  });
});

Deno.test('bulk-upsert-service-attendance calls RPC and reports its summary', async () => {
  await withFunctionEnv(async () => {
    const originalFetch = globalThis.fetch;
    const rpcCalls: Array<{ path: string; body: string }> = [];

    globalThis.fetch = (input, init) => {
      const requestUrl = new URL(input instanceof Request ? input.url : input.toString());

      if (requestUrl.pathname === '/auth/v1/user') {
        return jsonResponse({ id: 'admin-user' });
      }
      if (requestUrl.pathname === '/rest/v1/admins') {
        return jsonResponse({ id: 'admin-record', role: 'admin' });
      }
      if (requestUrl.pathname === '/rest/v1/rpc/apply_bulk_service_attendance_upsert') {
        rpcCalls.push({ path: requestUrl.pathname, body: String(init?.body) });
        return jsonResponse([{ inserted_count: 2, updated_count: 1, total_count: 3 }]);
      }
      if (requestUrl.pathname === '/rest/v1/admin_audit_logs') {
        return Promise.resolve(new Response(null, { status: 201 }));
      }

      return Promise.resolve(new Response('Unexpected request', { status: 500 }));
    };

    try {
      const response = await handleBulkUpsertServiceAttendance(buildRequest(validPayload(), true));

      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        message: 'Successfully migrated 3 attendance records.',
        insertedCount: 2,
        updatedCount: 1,
        totalCount: 3,
      });
      assertEquals(rpcCalls.length, 1);
      assertEquals(JSON.parse(rpcCalls[0].body), {
        p_layout_id: LAYOUT_ID,
        p_rows: [
          {
            ...validPayload().rows[0],
            is_walk_in: false,
            is_override: false,
            is_manual_entry: false,
            metadata: {},
          },
        ],
        p_admin_user_id: 'admin-user',
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
