import { assertEquals } from '@std/assert';

import { handleBulkImportRecruitmentApplications } from '../handler.ts';

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

function buildRequest(body: unknown, token?: string) {
  const headers: Record<string, string> = {
    origin: TEST_ORIGIN,
    'content-type': 'application/json',
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  return new Request('https://example.functions/bulk-import-recruitment-applications', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function validRow() {
  return {
    email: 'applicant@example.com',
    first_name: 'John',
    middle_name: null,
    last_name: 'Doe',
    nickname: 'Johnny',
    phone: '09171234567',
    date_of_birth: '1995-05-15',
    gender: 'Male',
    life_stage: 'Single',
    desired_role: 'Usher',
    status: 'active',
    current_step: 3,
    personal_details: { occupation: 'Engineer', legacy_id: 101 },
    emergency_contact: { name: 'Jane Doe', phone: '09179876543', relation: 'Mother' },
    application_history: { is_first_time_applicant: true },
    spiritual_background: { ccf_member_since: '2020 Jan', glc1_status: 'Completed' },
    dgroup_info: {
      is_constant_attendee: true,
      member_since: '2021 Jan',
      leader_name: 'Leader Name',
      leader_email: 'leader@example.com',
      leader_phone: '09181234567',
      is_dgroup_leader: false,
    },
    is_endorsed: true,
    transactions: [
      {
        step_number: 1,
        step_key: 'register',
        transaction_type: 'completed',
        status: 'completed',
      },
      {
        step_number: 2,
        step_key: 'interview',
        transaction_type: 'completed',
        status: 'completed',
      },
      {
        step_number: 3,
        step_key: 'orientation',
        transaction_type: 'scheduled',
        status: 'scheduled',
      },
    ],
  };
}

function jsonResponse(body: unknown): Promise<Response> {
  return Promise.resolve(Response.json(body));
}

Deno.test('bulk-import-recruitment rejects invalid row schema with 400', async () => {
  await withFunctionEnv(async () => {
    const response = await handleBulkImportRecruitmentApplications(
      buildRequest({ rows: [{ ...validRow(), email: 'not-an-email' }] }),
    );

    assertEquals(response.status, 400);
    assertEquals(response.headers.get('Access-Control-Allow-Origin'), TEST_ORIGIN);
    assertEquals(response.headers.get('Content-Type'), 'application/json');
  });
});

Deno.test('bulk-import-recruitment rejects unauthenticated request with 401', async () => {
  await withFunctionEnv(async () => {
    const response = await handleBulkImportRecruitmentApplications(
      buildRequest({ rows: [validRow()] }),
    );

    assertEquals(response.status, 401);
    assertEquals(await response.json(), {
      success: false,
      error: 'Unauthorized',
      error_code: 'UNAUTHORIZED',
    });
  });
});

Deno.test('bulk-import-recruitment successfully executes RPC and returns summary', async () => {
  await withFunctionEnv(async () => {
    const originalFetch = globalThis.fetch;
    let rpcBody: { p_rows?: unknown[] } | undefined;

    globalThis.fetch = (input, init) => {
      const requestUrl = new URL(input instanceof Request ? input.url : input.toString());

      if (requestUrl.pathname === '/auth/v1/user') {
        return jsonResponse({ id: 'admin-user' });
      }

      if (requestUrl.pathname === '/rest/v1/admins') {
        return jsonResponse({ id: 'admin-record', role: 'admin' });
      }

      if (requestUrl.pathname === '/rest/v1/admin_role_permissions') {
        return jsonResponse([{ permission: 'canWriteAdminData' }]);
      }

      if (requestUrl.pathname === '/rest/v1/rpc/apply_bulk_recruitment_import') {
        rpcBody = JSON.parse(String(init?.body)) as { p_rows?: unknown[] };
        return jsonResponse([{ inserted_count: 1, skipped_count: 0 }]);
      }

      return Promise.resolve(new Response('Unexpected request', { status: 500 }));
    };

    try {
      const response = await handleBulkImportRecruitmentApplications(
        buildRequest({ rows: [validRow()] }, 'admin-jwt-token'),
      );

      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        inserted_count: 1,
        skipped_count: 0,
        total_count: 1,
      });
      assertEquals(Array.isArray(rpcBody?.p_rows), true);
      assertEquals(rpcBody?.p_rows?.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
