import { assert, assertEquals } from 'jsr:@std/assert@1';

import { HTTP_STATUS } from './constants.ts';
import { useEdgeHook } from './edge.ts';
import { z } from './validation.ts';

const TEST_ORIGIN = 'https://app.example.com';
const TEST_ALLOWED_ORIGINS = [TEST_ORIGIN];

async function withFunctionEnv(run: () => Promise<void>) {
  const previousUrl = Deno.env.get('SUPABASE_URL');
  const previousServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');

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
      rateLimit: {
        scope: 'invalid-config',
        windowMs: 60_000,
        maxHits: 1,
      },
    });

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
