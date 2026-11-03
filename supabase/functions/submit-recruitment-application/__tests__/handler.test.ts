import { assert, assertEquals } from '@std/assert';

import { handleSubmitRecruitmentApplication } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const APPLICATION_ID = '11111111-1111-4111-8111-111111111111';
const APPROVAL_ID = '22222222-2222-4222-8222-222222222222';
let requestNumber = 0;

const applicationRequest = {
  email: 'applicant@example.com',
  first_name: 'Jane',
  middle_name: null,
  last_name: 'Doe',
  nickname: 'Janey',
  phone: '+639171234567',
  date_of_birth: '1995-05-10',
  gender: 'Female',
  life_stage: 'Single',
  desired_role: 'Usher',
  personal_details: {
    wedding_anniversary: null,
    occupation: 'Designer',
    company_name: 'Example Co.',
  },
  emergency_contact: {
    name: 'John Doe',
    phone: '+639171234568',
    relation: 'Sibling',
  },
  application_history: {
    is_first_time_applicant: true,
    previous_application_notes: null,
  },
  spiritual_background: {
    ccf_member_since: '2010 Jan',
    other_ministries: null,
    glc1_status: 'Completed',
    glc2_status: 'Ongoing',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2020 Jan',
    leader_name: 'Leader Name',
    leader_email: 'leader@example.com',
    leader_phone: '+639171234569',
    is_dgroup_leader: false,
    leader_since: null,
    dgroup_member_count: null,
  },
  survey_answers: { survey_q1: 'true', survey_q2: 'false' },
  applicant_attested: true,
};

const recruitmentSettings = {
  is_recruitment_open: true,
  eligibility_rules: {
    min_age: 18,
    max_age: 45,
    requires_glc1_completed: true,
    min_dgroup_months: 6,
  },
  survey_questions: [
    { field_key: 'survey_q1', is_active: true, is_required: true, correct_answer: 'true' },
    { field_key: 'survey_q2', is_active: true, is_required: true, correct_answer: 'true' },
  ],
};

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

function createRequest(body: unknown, authenticated = true) {
  const headers: Record<string, string> = {
    origin: ORIGIN,
    'content-type': 'application/json',
    'x-forwarded-for': `203.0.113.${++requestNumber}`,
  };
  if (authenticated) headers.authorization = 'Bearer test-user-token';

  return new Request('https://example.functions/submit-recruitment-application', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(options: { settings?: unknown; failRequest?: string; role?: string } = {}) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; method: string; body: unknown }> = [];

  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method ?? 'GET';
    const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : null;
    calls.push({ path: url.pathname, method, body });

    if (options.failRequest === `${method} ${url.pathname}`) {
      return Promise.resolve(Response.json({ message: 'request failed' }, { status: 500 }));
    }

    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(
        Response.json({
          id: 'auth-user-1',
          aud: 'authenticated',
          role: 'authenticated',
          email: 'operator@example.com',
          app_metadata: { provider: 'google', providers: ['google'] },
          user_metadata: {},
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        }),
      );
    }

    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(Response.json({ id: 'admin-row-1', role: options.role ?? 'admin' }));
    }

    if (url.pathname === '/rest/v1/recruitment_settings') {
      return Promise.resolve(Response.json(options.settings ?? recruitmentSettings));
    }

    if (url.pathname === '/rest/v1/recruitment_applications' && method === 'POST') {
      return Promise.resolve(Response.json({ id: APPLICATION_ID }));
    }

    if (url.pathname === '/rest/v1/approval_requests' && method === 'POST') {
      return Promise.resolve(Response.json({ id: APPROVAL_ID, access_token: 'approval-token' }));
    }

    if (url.pathname.startsWith('/rest/v1/rpc/')) {
      if (url.pathname.endsWith('/enqueue_email_notification')) {
        return Promise.resolve(Response.json(1));
      }
      return Promise.resolve(Response.json(null));
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
  'submit-recruitment-application accepts an authorized admin submission and scores configured answers',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch();
      try {
        const response = await handleSubmitRecruitmentApplication(
          createRequest(applicationRequest),
        );

        assertEquals(response.status, 201);
        const result = await response.json();
        assertEquals(result.success, true);
        assertEquals(result.application_id, APPLICATION_ID);
        assertEquals('survey_score' in result, false);

        const applicationInsert = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'POST',
        );
        const applicationPayload = applicationInsert?.body as Record<string, unknown>;
        assertEquals(applicationPayload.auth_user_id, null);
        assertEquals(applicationPayload.survey_score, 1);
        assertEquals(applicationPayload.survey_total, 2);

        const transactionInsert = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_pipeline_transactions',
        );
        assertEquals(Array.isArray(transactionInsert?.body), true);
        const steps = transactionInsert?.body as Array<Record<string, unknown>>;
        assertEquals(
          steps.map((step) => step.status),
          ['completed', 'pending', 'skipped'],
        );
        assertEquals(
          mock.calls.some(
            (call) => call.path === '/rest/v1/approval_requests' && call.method === 'POST',
          ),
          true,
        );
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test('submit-recruitment-application rejects unauthenticated callers', async () => {
  await withEnv(async () => {
    const mock = mockFetch();
    try {
      const response = await handleSubmitRecruitmentApplication(
        createRequest(applicationRequest, false),
      );

      assertEquals(response.status, 401);
      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/recruitment_settings'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('submit-recruitment-application rejects other authenticated admin roles', async () => {
  await withEnv(async () => {
    for (const role of ['slod', 'imt']) {
      const mock = mockFetch({ role });
      try {
        const response = await handleSubmitRecruitmentApplication(
          createRequest(applicationRequest),
        );

        assertEquals(response.status, 401);
        assertEquals(
          mock.calls.some((call) => call.path === '/rest/v1/recruitment_settings'),
          false,
        );
      } finally {
        mock.restore();
      }
    }
  });
});

Deno.test(
  'submit-recruitment-application accepts kiosk and VMT roles but honors the closed setting',
  async () => {
    await withEnv(async () => {
      for (const role of ['kiosk', 'vmt']) {
        const mock = mockFetch({
          role,
          settings: { ...recruitmentSettings, is_recruitment_open: false },
        });
        try {
          const response = await handleSubmitRecruitmentApplication(
            createRequest(applicationRequest),
          );

          assertEquals(response.status, 403);
          const result = await response.json();
          assertEquals(result.error_code, 'RECRUITMENT_CLOSED');
        } finally {
          mock.restore();
        }
      }
    });
  },
);

Deno.test('submit-recruitment-application rejects closed recruitment before writing', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      settings: { ...recruitmentSettings, is_recruitment_open: false },
    });
    try {
      const response = await handleSubmitRecruitmentApplication(createRequest(applicationRequest));

      assertEquals(response.status, 403);
      const result = await response.json();
      assertEquals(result.error_code, 'RECRUITMENT_CLOSED');
      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/recruitment_applications'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('submit-recruitment-application accepts omitted optional survey answers', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      settings: {
        ...recruitmentSettings,
        survey_questions: [
          recruitmentSettings.survey_questions[0],
          { ...recruitmentSettings.survey_questions[1], is_required: false },
        ],
      },
    });
    try {
      const request = {
        ...applicationRequest,
        survey_answers: { survey_q1: 'true' as const },
      };
      const response = await handleSubmitRecruitmentApplication(createRequest(request));

      assertEquals(response.status, 201);
      const applicationInsert = mock.calls.find(
        (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'POST',
      );
      const payload = applicationInsert?.body as Record<string, unknown>;
      assertEquals(payload.survey_score, 1);
      assertEquals(payload.survey_total, 2);
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'submit-recruitment-application removes partial records when endorsement creation fails',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({ failRequest: 'POST /rest/v1/approval_requests' });
      try {
        const response = await handleSubmitRecruitmentApplication(
          createRequest(applicationRequest),
        );

        assertEquals(response.status, 500);
        const result = await response.json();
        assertEquals(result.error_code, 'ENDORSEMENT_CREATE_FAILED');
        assert(
          mock.calls.some(
            (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'DELETE',
          ),
        );
      } finally {
        mock.restore();
      }
    });
  },
);
