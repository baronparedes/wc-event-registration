import { assertEquals } from '@std/assert';

import { handleDeployRecruitmentApplicant } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const APPLICATION_ID = '22222222-2222-4222-8222-222222222222';
const MEMBER_USER_ID = '33333333-3333-4333-8333-333333333333';
let requestNumber = 0;

async function withEnv(run: () => Promise<void>) {
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS'];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', ORIGIN);
  try {
    await run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function createRequest(role: string) {
  return new Request('https://example.functions/deploy-recruitment-applicant', {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      authorization: 'Bearer valid-access-token',
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
      'x-test-role': role,
    },
    body: JSON.stringify({ application_id: APPLICATION_ID }),
  });
}

function mockFetch(role: string, failDeployment = false, alreadyDeployed = false) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; method: string; body: unknown }> = [];
  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method ?? 'GET';
    const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : null;
    calls.push({ path: url.pathname, method, body });

    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: USER_ID, email: 'admin@example.com' }));
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: USER_ID, role }));
    }
    if (url.pathname === '/rest/v1/recruitment_applications') {
      return Promise.resolve(
        Response.json({
          id: APPLICATION_ID,
          full_name: 'Jane Doe',
          email: 'jane@example.com',
          desired_role: 'Usher',
          confirmed_role: 'Usher',
          auth_user_id: MEMBER_USER_ID,
        }),
      );
    }
    if (url.pathname === '/rest/v1/rpc/deploy_recruitment_applicant') {
      if (failDeployment) {
        return Promise.resolve(
          Response.json({ message: 'Deployment prerequisites failed' }, { status: 400 }),
        );
      }
      return Promise.resolve(
        Response.json({
          success: true,
          application_id: APPLICATION_ID,
          user_id: '44444444-4444-4444-8444-444444444444',
          member_id: 'WC-1001',
          already_deployed: alreadyDeployed,
        }),
      );
    }
    if (url.pathname.endsWith('/enqueue_email_notification')) {
      return Promise.resolve(Response.json(1));
    }
    if (url.pathname.endsWith('/trigger_email_processor')) {
      return Promise.resolve(Response.json(null));
    }
    if (url.pathname === '/rest/v1/app_notifications' && method === 'POST') {
      return Promise.resolve(Response.json({ id: '55555555-5555-4555-8555-555555555555' }));
    }
    if (url.pathname === '/functions/v1/cron-process-email-queue') {
      return Promise.resolve(Response.json({ success: true }));
    }
    return Promise.resolve(Response.json([]));
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'deploy-recruitment-applicant allows SLOD and invokes atomic deployment RPC',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch('slod');
      try {
        const response = await handleDeployRecruitmentApplicant(createRequest('slod'));

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.member_id, 'WC-1001');
        assertEquals(body.notifications_sent, true);
        assertEquals(
          mock.calls.some((call) => call.path === '/rest/v1/rpc/deploy_recruitment_applicant'),
          true,
        );
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test('deploy-recruitment-applicant rejects VMT before invoking deployment RPC', async () => {
  await withEnv(async () => {
    const mock = mockFetch('vmt');
    try {
      const response = await handleDeployRecruitmentApplicant(createRequest('vmt'));

      assertEquals(response.status, 401);
      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/rpc/deploy_recruitment_applicant'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('deploy-recruitment-applicant reports deployment prerequisite failures', async () => {
  await withEnv(async () => {
    const mock = mockFetch('admin', true);
    try {
      const response = await handleDeployRecruitmentApplicant(createRequest('admin'));

      assertEquals(response.status, 409);
      const body = await response.json();
      assertEquals(body.success, false);
      assertEquals(body.error_code, 'DEPLOYMENT_FAILED');
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'deploy-recruitment-applicant does not resend notifications for deployment retries',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch('admin', false, true);
      try {
        const response = await handleDeployRecruitmentApplicant(createRequest('admin'));

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.already_deployed, true);
        assertEquals(body.notifications_sent, false);
        assertEquals(
          mock.calls.some((call) => call.path.endsWith('/enqueue_email_notification')),
          false,
        );
        assertEquals(
          mock.calls.some(
            (call) => call.path === '/rest/v1/app_notifications' && call.method === 'POST',
          ),
          false,
        );
      } finally {
        mock.restore();
      }
    });
  },
);
