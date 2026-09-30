import { assertEquals } from '@std/assert';

import { handleManageAdminRole } from '../handler.ts';

const TEST_ORIGIN = 'https://app.example.com';
const TARGET_AUTH_USER_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ADMIN_ID = '22222222-2222-4222-8222-222222222222';

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
  return new Request('https://example.functions/manage-admin-role', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: {
  callerRole?: string;
  targetRole?: string | null;
  targetExists?: boolean;
  writeError?: boolean;
}) {
  const originalFetch = globalThis.fetch;
  const callerUserId = crypto.randomUUID();
  const writes: Array<{ method: string; body?: unknown; url: string }> = [];

  globalThis.fetch = (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: callerUserId }));
    }
    if (requestUrl.pathname === '/rest/v1/admins') {
      const method = init?.method ?? 'GET';
      const authUserFilter = requestUrl.searchParams.get('auth_user_id');
      const adminIdFilter = requestUrl.searchParams.get('id');

      if (method === 'GET' && authUserFilter === `eq.${callerUserId}`) {
        return Promise.resolve(
          Response.json({ id: 'caller-admin-row', role: options.callerRole ?? 'super_admin' }),
        );
      }
      if (method === 'GET' && authUserFilter === `eq.${TARGET_AUTH_USER_ID}`) {
        if (options.targetExists === false) {
          return Promise.resolve(Response.json([]));
        }
        return Promise.resolve(
          Response.json({ id: TARGET_ADMIN_ID, role: options.targetRole ?? 'admin' }),
        );
      }
      if (method === 'GET' && adminIdFilter === `eq.${TARGET_ADMIN_ID}`) {
        if (options.targetExists === false) {
          return Promise.resolve(Response.json([]));
        }
        return Promise.resolve(
          Response.json({ id: TARGET_ADMIN_ID, role: options.targetRole ?? 'admin' }),
        );
      }
      if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
        writes.push({
          method,
          url: requestUrl.toString(),
          ...(init?.body ? { body: JSON.parse(String(init.body)) as unknown } : {}),
        });
        if (options.writeError) {
          return Promise.resolve(Response.json({ message: 'write failed' }, { status: 500 }));
        }
        if (method === 'DELETE') {
          return Promise.resolve(new Response(null, { status: 204 }));
        }
        return Promise.resolve(
          Response.json(
            {
              id: TARGET_ADMIN_ID,
              auth_user_id: TARGET_AUTH_USER_ID,
              role: 'imt',
              created_at: '2026-09-30T00:00:00.000Z',
            },
            { status: 200 },
          ),
        );
      }
    }
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };

  return {
    writes,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'manage-admin-role validates payloads and requires super-admin authorization',
  async () => {
    await withFunctionEnv(async () => {
      const invalid = await handleManageAdminRole(
        buildRequest({ action: 'assign', auth_user_id: 'bad', role: 'admin' }),
      );
      const unauthorized = await handleManageAdminRole(
        buildRequest({ action: 'assign', auth_user_id: TARGET_AUTH_USER_ID, role: 'admin' }, false),
      );
      const wrongRoleMock = mockFetch({ callerRole: 'admin' });
      try {
        const wrongRole = await handleManageAdminRole(
          buildRequest({ action: 'assign', auth_user_id: TARGET_AUTH_USER_ID, role: 'admin' }),
        );
        assertEquals(invalid.status, 400);
        assertEquals(unauthorized.status, 401);
        assertEquals(wrongRole.status, 401);
      } finally {
        wrongRoleMock.restore();
      }
    });
  },
);

Deno.test(
  'manage-admin-role assigns an allowed role when the target has no existing role',
  async () => {
    await withFunctionEnv(async () => {
      const fetchMock = mockFetch({ targetExists: false });
      try {
        const response = await handleManageAdminRole(
          buildRequest({ action: 'assign', auth_user_id: TARGET_AUTH_USER_ID, role: 'imt' }),
        );
        assertEquals(response.status, 200);
        assertEquals((await response.json()).data.role, 'imt');
        assertEquals(fetchMock.writes[0].method, 'POST');
        assertEquals(fetchMock.writes[0].body, {
          auth_user_id: TARGET_AUTH_USER_ID,
          role: 'imt',
        });
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('manage-admin-role refuses to change an existing super-admin target', async () => {
  await withFunctionEnv(async () => {
    const updateMock = mockFetch({ targetRole: 'super_admin' });
    try {
      const response = await handleManageAdminRole(
        buildRequest({ action: 'update', admin_id: TARGET_ADMIN_ID, role: 'admin' }),
      );
      assertEquals(response.status, 409);
      assertEquals((await response.json()).error_code, 'PROTECTED_ROLE');
      assertEquals(updateMock.writes, []);
    } finally {
      updateMock.restore();
    }

    const assignMock = mockFetch({ targetRole: 'super_admin' });
    try {
      const response = await handleManageAdminRole(
        buildRequest({ action: 'assign', auth_user_id: TARGET_AUTH_USER_ID, role: 'admin' }),
      );
      assertEquals(response.status, 409);
      assertEquals((await response.json()).error_code, 'PROTECTED_ROLE');
      assertEquals(assignMock.writes, []);
    } finally {
      assignMock.restore();
    }
  });
});

Deno.test('manage-admin-role updates and revokes an existing role', async () => {
  await withFunctionEnv(async () => {
    const updateMock = mockFetch({});
    try {
      const response = await handleManageAdminRole(
        buildRequest({ action: 'update', admin_id: TARGET_ADMIN_ID, role: 'imt' }),
      );
      assertEquals(response.status, 200);
      assertEquals(updateMock.writes[0].method, 'PATCH');
      assertEquals(updateMock.writes[0].body, { role: 'imt' });
    } finally {
      updateMock.restore();
    }

    const revokeMock = mockFetch({});
    try {
      const response = await handleManageAdminRole(
        buildRequest({ action: 'revoke', admin_id: TARGET_ADMIN_ID }),
      );
      assertEquals(response.status, 200);
      assertEquals(await response.json(), { success: true });
      assertEquals(revokeMock.writes[0].method, 'DELETE');
    } finally {
      revokeMock.restore();
    }
  });
});

Deno.test('manage-admin-role reports missing targets and failed writes', async () => {
  await withFunctionEnv(async () => {
    const missingMock = mockFetch({ targetExists: false });
    try {
      const response = await handleManageAdminRole(
        buildRequest({ action: 'update', admin_id: TARGET_ADMIN_ID, role: 'imt' }),
      );
      assertEquals(response.status, 404);
      assertEquals((await response.json()).error_code, 'ADMIN_ROLE_NOT_FOUND');
    } finally {
      missingMock.restore();
    }

    const writeErrorMock = mockFetch({ targetExists: false, writeError: true });
    try {
      const response = await handleManageAdminRole(
        buildRequest({ action: 'assign', auth_user_id: TARGET_AUTH_USER_ID, role: 'admin' }),
      );
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error, 'Failed to assign admin role');
    } finally {
      writeErrorMock.restore();
    }
  });
});
