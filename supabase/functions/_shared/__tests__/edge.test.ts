import { assert, assertEquals } from '@std/assert';

import { HTTP_STATUS } from '../constants.ts';
import { isLocalBroadcastEnabled, useEdgeHook } from '../edge.ts';
import { z } from '../validation.ts';

const TEST_ORIGIN = 'https://app.example.com';
const TEST_ALLOWED_ORIGINS = [TEST_ORIGIN];

async function withFunctionEnv(run: () => Promise<void>) {
  const previousUrl = Deno.env.get('SUPABASE_URL');
  const previousServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const previousCronRoleKey = Deno.env.get('CRON_ROLE_KEY');

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('CRON_ROLE_KEY', 'test-cron-role-key');

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

    if (previousCronRoleKey === undefined) {
      Deno.env.delete('CRON_ROLE_KEY');
    } else {
      Deno.env.set('CRON_ROLE_KEY', previousCronRoleKey);
    }
  }
}

function buildRequest(method: string, init?: { body?: unknown; headers?: HeadersInit }) {
  const headers = new Headers(init?.headers);
  if (!headers.has('origin')) {
    headers.set('origin', TEST_ORIGIN);
  }

  let body: string | undefined;
  if (init && 'body' in init) {
    body = JSON.stringify(init.body);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
  }

  return new Request('https://example.functions/member-lookup', {
    method,
    headers,
    body,
  });
}

Deno.test('useEdgeHook returns method not allowed when method does not match', async () => {
  await withFunctionEnv(async () => {
    const req = buildRequest('GET');

    const result = await useEdgeHook({
      req,
      functionName: 'test-method-mismatch',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
      method: 'POST',
    });

    assert(!result.valid);
    assertEquals(result.response.status, HTTP_STATUS.methodNotAllowed);
  });
});

Deno.test('useEdgeHook parses schema and returns typed data on success', async () => {
  await withFunctionEnv(async () => {
    const req = buildRequest('POST', { body: { memberId: '123' } });

    const result = await useEdgeHook({
      req,
      functionName: 'test-schema-success',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
      schema: z.object({ memberId: z.string().min(1) }),
    });

    assert(result.valid);
    assertEquals(result.data.memberId, '123');
  });
});

Deno.test('useEdgeHook returns bad request when schema validation fails', async () => {
  await withFunctionEnv(async () => {
    const req = buildRequest('POST', { body: { memberId: '' } });

    const result = await useEdgeHook({
      req,
      functionName: 'test-schema-failure',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
      schema: z.object({ memberId: z.string().min(1) }),
    });

    assert(!result.valid);
    assertEquals(result.response.status, HTTP_STATUS.badRequest);
  });
});

Deno.test('useEdgeHook enforces public rate limit when configured', async () => {
  await withFunctionEnv(async () => {
    const scope = `test-public-rate-${crypto.randomUUID()}`;

    const first = await useEdgeHook({
      req: buildRequest('POST', { headers: { 'x-real-ip': '203.0.113.9' } }),
      functionName: 'test-public-rate',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
      publicRateLimit: {
        scope,
        windowMs: 60_000,
        maxHits: 1,
      },
    });

    const second = await useEdgeHook({
      req: buildRequest('POST', { headers: { 'x-real-ip': '203.0.113.9' } }),
      functionName: 'test-public-rate',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
      publicRateLimit: {
        scope,
        windowMs: 60_000,
        maxHits: 1,
      },
    });

    assert(first.valid);
    assert(!second.valid);
    assertEquals(second.response.status, HTTP_STATUS.tooManyRequests);
  });
});

Deno.test('useEdgeHook rejects rateLimit config when requireAdmin is not enabled', async () => {
  await withFunctionEnv(async () => {
    const req = buildRequest('POST');

    const result = await useEdgeHook({
      req,
      functionName: 'test-invalid-admin-rate-config',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
      requireAdmin: false,
      rateLimit: {
        scope: 'invalid-config',
        windowMs: 60_000,
        maxHits: 1,
      },
    } as unknown as Parameters<typeof useEdgeHook>[0]);

    assert(!result.valid);
    assertEquals(result.response.status, HTTP_STATUS.internalServerError);
  });
});

Deno.test('useEdgeHook enforces admin auth when requireAdmin is true', async () => {
  await withFunctionEnv(async () => {
    const req = buildRequest('POST');

    const result = await useEdgeHook({
      req,
      functionName: 'test-admin-auth',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
      requireAdmin: true,
      rateLimit: {
        scope: 'admin-auth',
        windowMs: 60_000,
        maxHits: 10,
      },
    });

    assert(!result.valid);
    assertEquals(result.response.status, HTTP_STATUS.unauthorized);
  });
});

Deno.test('useEdgeHook handles allowed and denied CORS preflight requests', async () => {
  await withFunctionEnv(async () => {
    const allowed = await useEdgeHook({
      req: buildRequest('OPTIONS'),
      functionName: 'test-preflight-allowed',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
    });
    const denied = await useEdgeHook({
      req: buildRequest('OPTIONS', { headers: { origin: 'https://evil.example.com' } }),
      functionName: 'test-preflight-denied',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
    });

    assert(!allowed.valid);
    assertEquals(allowed.response.status, 200);
    assertEquals(await allowed.response.text(), 'ok');
    assertEquals(allowed.corsHeaders['Access-Control-Allow-Origin'], TEST_ORIGIN);
    assert(!denied.valid);
    assertEquals(denied.response.status, 404);
  });
});

Deno.test(
  'useEdgeHook rejects requests when required Supabase environment is missing',
  async () => {
    const previousUrl = Deno.env.get('SUPABASE_URL');
    const previousServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    Deno.env.delete('SUPABASE_URL');
    Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');

    try {
      const result = await useEdgeHook({
        req: buildRequest('POST'),
        functionName: 'test-missing-env',
        allowedOrigins: TEST_ALLOWED_ORIGINS,
      });

      assert(!result.valid);
      assertEquals(result.response.status, HTTP_STATUS.internalServerError);
    } finally {
      if (previousUrl === undefined) Deno.env.delete('SUPABASE_URL');
      else Deno.env.set('SUPABASE_URL', previousUrl);

      if (previousServiceRoleKey === undefined) Deno.env.delete('SUPABASE_SERVICE_ROLE_KEY');
      else Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', previousServiceRoleKey);
    }
  },
);

Deno.test('useEdgeHook accepts the configured cron key from the dedicated header', async () => {
  await withFunctionEnv(async () => {
    const result = await useEdgeHook({
      req: buildRequest('POST', { headers: { 'x-cron-key': 'test-cron-role-key' } }),
      functionName: 'test-cron-header',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
      requireCron: true,
    });

    assert(result.valid);
    assertEquals(result.callerType, 'cron');
  });
});

Deno.test('useEdgeHook rejects an invalid required cron key', async () => {
  await withFunctionEnv(async () => {
    const result = await useEdgeHook({
      req: buildRequest('POST', { headers: { 'x-cron-key': 'wrong-key' } }),
      functionName: 'test-cron-invalid',
      allowedOrigins: TEST_ALLOWED_ORIGINS,
      requireCron: true,
    });

    assert(!result.valid);
    assertEquals(result.response.status, HTTP_STATUS.unauthorized);
  });
});

Deno.test(
  'useEdgeHook classifies service-role authentication for admin and cron handlers',
  async () => {
    await withFunctionEnv(async () => {
      const serviceRoleRequest = () =>
        buildRequest('POST', { headers: { authorization: 'Bearer test-service-role-key' } });

      const adminResult = await useEdgeHook({
        req: serviceRoleRequest(),
        functionName: 'test-admin-service-role',
        allowedOrigins: TEST_ALLOWED_ORIGINS,
        requireAdmin: true,
        allowServiceRole: true,
      });
      const cronResult = await useEdgeHook({
        req: serviceRoleRequest(),
        functionName: 'test-cron-service-role',
        allowedOrigins: TEST_ALLOWED_ORIGINS,
        requireCron: true,
        allowServiceRole: true,
      });

      assert(adminResult.valid);
      assertEquals(adminResult.callerType, 'service_role');
      assert(cronResult.valid);
      assertEquals(cronResult.callerType, 'service_role');
    });
  },
);

Deno.test('isLocalBroadcastEnabled detects environments accurately', () => {
  const originalEnv = {
    LOCAL_BROADCAST: Deno.env.get('LOCAL_BROADCAST'),
    NODE_ENV: Deno.env.get('NODE_ENV'),
    RUNTIME_ENV: Deno.env.get('RUNTIME_ENV'),
    ENVIRONMENT: Deno.env.get('ENVIRONMENT'),
    SUPABASE_URL: Deno.env.get('SUPABASE_URL'),
    DENO_REGION: Deno.env.get('DENO_REGION'),
    DENO_DEPLOYMENT_ID: Deno.env.get('DENO_DEPLOYMENT_ID'),
  };

  const setEnv = (vars: Record<string, string | undefined>) => {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) Deno.env.delete(k);
      else Deno.env.set(k, v);
    }
  };

  try {
    // 1. Explicit true flag
    setEnv({
      LOCAL_BROADCAST: 'true',
      NODE_ENV: undefined,
      SUPABASE_URL: 'http://localhost:54321',
    });
    assertEquals(isLocalBroadcastEnabled(), true);

    // 2. Explicit false flag
    setEnv({
      LOCAL_BROADCAST: 'false',
      NODE_ENV: undefined,
      SUPABASE_URL: 'http://localhost:54321',
    });
    assertEquals(isLocalBroadcastEnabled(), false);

    // 3. Supabase Cloud URL detection (.supabase.co)
    setEnv({
      LOCAL_BROADCAST: undefined,
      NODE_ENV: undefined,
      ENVIRONMENT: undefined,
      RUNTIME_ENV: undefined,
      SUPABASE_URL: 'https://xyzprod.supabase.co',
      DENO_REGION: undefined,
      DENO_DEPLOYMENT_ID: undefined,
    });
    assertEquals(isLocalBroadcastEnabled(), false);

    // 4. Supabase Cloud runtime detection (DENO_REGION)
    setEnv({
      LOCAL_BROADCAST: undefined,
      NODE_ENV: undefined,
      ENVIRONMENT: undefined,
      RUNTIME_ENV: undefined,
      SUPABASE_URL: 'https://custom-gateway.app',
      DENO_REGION: 'ap-southeast-1',
    });
    assertEquals(isLocalBroadcastEnabled(), false);

    // 5. Localhost / Local CLI
    setEnv({
      LOCAL_BROADCAST: undefined,
      NODE_ENV: undefined,
      ENVIRONMENT: undefined,
      RUNTIME_ENV: undefined,
      SUPABASE_URL: 'http://127.0.0.1:54321',
      DENO_REGION: undefined,
      DENO_DEPLOYMENT_ID: undefined,
    });
    assertEquals(isLocalBroadcastEnabled(), true);
  } finally {
    setEnv(originalEnv);
  }
});
