import { assertEquals } from '@std/assert';

import { handleUpdateRecruitmentStage } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';
const APPLICATION_ID = '33333333-3333-4333-8333-333333333333';
const APPROVAL_ID = '44444444-4444-4444-8444-444444444444';
let requestNumber = 0;

const applicationRecord = {
  id: APPLICATION_ID,
  auth_user_id: USER_ID,
  email: 'applicant@example.com',
  first_name: 'Jane',
  last_name: 'Doe',
  full_name: 'Jane Doe',
  desired_role: 'Usher',
  confirmed_role: null,
  current_step: 8,
  status: 'active',
  dgroup_approval_id: APPROVAL_ID,
  dgroup_info: { leader_email: 'leader@example.com' },
  service_commitments: {},
  vmt_registered: false,
  ccf_vmt_id: null,
  ccf_vmt_date: null,
  assigned_rfid_member_id: null,
  avatar_object_key: null,
  deployed_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  applicant_attested_at: new Date().toISOString(),
  application_history: {},
  emergency_contact: {},
  personal_details: {},
  spiritual_background: {},
  survey_answers: {},
  survey_score: 1,
  survey_total: 1,
  middle_name: null,
  phone: '+639171234567',
  date_of_birth: '1995-05-10',
  gender: 'Female',
  life_stage: 'Single',
  promoted_user_id: null,
  vmt_registered_at: null,
  vmt_verified_by: null,
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

function createRequest(
  body: unknown,
  userId = USER_ID,
  authHeader: string | null = 'Bearer valid-access-token',
) {
  const headers: Record<string, string> = {
    origin: ORIGIN,
    'content-type': 'application/json',
    'x-forwarded-for': `203.0.113.${++requestNumber}`,
    'x-test-user-id': userId,
  };
  if (authHeader) headers.authorization = authHeader;
  return new Request('https://example.functions/update-recruitment-stage', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(
  options: {
    application?: unknown;
    adminRole?: string | null;
    approvalStatus?: string;
    authUserEmail?: string | null;
    failVmtRpc?: boolean;
  } = {},
) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; method: string; body: unknown }> = [];

  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method ?? 'GET';
    const body = init?.body ? (JSON.parse(String(init.body)) as unknown) : null;
    calls.push({ path: url.pathname, method, body });

    if (url.pathname === '/auth/v1/user') {
      return Promise.resolve(Response.json({ id: USER_ID, email: 'applicant@example.com' }));
    }
    if (url.pathname === `/auth/v1/admin/users/${USER_ID}`) {
      return Promise.resolve(
        Response.json({
          user: {
            id: USER_ID,
            email:
              options.authUserEmail === undefined ? 'applicant@example.com' : options.authUserEmail,
          },
        }),
      );
    }
    if (url.pathname === '/rest/v1/admins') {
      return Promise.resolve(
        options.adminRole ? Response.json({ role: options.adminRole }) : Response.json(null),
      );
    }
    if (url.pathname === '/rest/v1/recruitment_applications') {
      return Promise.resolve(Response.json(options.application ?? applicationRecord));
    }
    if (url.pathname === '/rest/v1/rpc/complete_recruitment_vmt_registration') {
      if (options.failVmtRpc) {
        return Promise.resolve(Response.json({ message: 'RPC failed' }, { status: 500 }));
      }
      return Promise.resolve(
        Response.json({
          success: true,
          application_id: APPLICATION_ID,
          current_step: 8,
          vmt_registered: true,
          already_completed: false,
        }),
      );
    }
    if (url.pathname === '/rest/v1/approval_requests') {
      if (method === 'PATCH') {
        return Promise.resolve(Response.json({ id: APPROVAL_ID, access_token: 'rotated-token' }));
      }
      return Promise.resolve(Response.json({ status: options.approvalStatus ?? 'pending' }));
    }
    if (url.pathname.endsWith('/enqueue_email_notification')) {
      return Promise.resolve(Response.json(1));
    }
    if (url.pathname.endsWith('/trigger_email_processor')) {
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

Deno.test('update-recruitment-stage saves commitments for the matched applicant', async () => {
  await withEnv(async () => {
    const mock = mockFetch();
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'save_commitments',
          application_id: APPLICATION_ID,
          service_commitments: { first_sunday: ['9AM'], third_sunday: ['3PM'] },
        }),
      );

      assertEquals(response.status, 200);
      const update = mock.calls.find(
        (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'PATCH',
      );
      assertEquals((update?.body as Record<string, unknown>).service_commitments, {
        first_sunday: ['9AM'],
        third_sunday: ['3PM'],
      });
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage rejects requests without an access token', async () => {
  await withEnv(async () => {
    const mock = mockFetch();
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest(
          { action: 'save_commitments', application_id: APPLICATION_ID },
          USER_ID,
          null,
        ),
      );
      assertEquals(response.status, 401);
      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/recruitment_applications'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage rejects a session without a verified email', async () => {
  await withEnv(async () => {
    const mock = mockFetch({ authUserEmail: null });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({ action: 'save_commitments', application_id: APPLICATION_ID }),
      );
      assertEquals(response.status, 401);
      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/recruitment_applications'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'update-recruitment-stage reports atomic VMT RPC failures without direct writes',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        application: { ...applicationRecord, auth_user_id: null, current_step: 7 },
        failVmtRpc: true,
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({ action: 'complete_vmt', application_id: APPLICATION_ID }),
        );
        assertEquals(response.status, 409);
        assertEquals(
          mock.calls.some(
            (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'PATCH',
          ),
          false,
        );
        assertEquals(
          mock.calls.some(
            (call) =>
              call.path === '/rest/v1/recruitment_pipeline_transactions' && call.method !== 'GET',
          ),
          false,
        );
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage rejects commitment saves without data or at the wrong step',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        application: { ...applicationRecord, current_step: 7 },
      });
      try {
        const missingData = await handleUpdateRecruitmentStage(
          createRequest({ action: 'save_commitments', application_id: APPLICATION_ID }),
        );
        assertEquals(missingData.status, 400);

        const wrongStep = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'save_commitments',
            application_id: APPLICATION_ID,
            service_commitments: { first_sunday: ['9AM'] },
          }),
        );
        assertEquals(wrongStep.status, 409);
        assertEquals(
          mock.calls.some(
            (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'PATCH',
          ),
          false,
        );
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test('update-recruitment-stage handles a missing endorsement link on resend', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      application: { ...applicationRecord, dgroup_approval_id: null },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({ action: 'resend_endorsement', application_id: APPLICATION_ID }),
      );
      assertEquals(response.status, 404);
      assertEquals(
        mock.calls.some((call) => call.path === '/rest/v1/approval_requests'),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'update-recruitment-stage completes VMT registration through one atomic RPC',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        application: { ...applicationRecord, auth_user_id: null, current_step: 7 },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({ action: 'complete_vmt', application_id: APPLICATION_ID }),
        );

        assertEquals(response.status, 200);
        const result = await response.json();
        assertEquals(result.current_step, 8);
        const rpcCall = mock.calls.find(
          (call) => call.path === '/rest/v1/rpc/complete_recruitment_vmt_registration',
        );
        assertEquals((rpcCall?.body as Record<string, unknown>).p_application_id, APPLICATION_ID);
        assertEquals((rpcCall?.body as Record<string, unknown>).p_actor_user_id, USER_ID);
        assertEquals(
          mock.calls.some(
            (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'PATCH',
          ),
          false,
        );
        assertEquals(
          mock.calls.some(
            (call) =>
              call.path === '/rest/v1/recruitment_pipeline_transactions' && call.method !== 'GET',
          ),
          false,
        );
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test('update-recruitment-stage hides applications from a non-matching applicant', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      application: {
        ...applicationRecord,
        auth_user_id: OTHER_USER_ID,
        email: 'other@example.com',
      },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({ action: 'save_commitments', application_id: APPLICATION_ID }),
      );

      assertEquals(response.status, 404);
      assertEquals(
        mock.calls.some(
          (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'PATCH',
        ),
        false,
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'update-recruitment-stage blocks SLOD from entering observation before endorsement',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'slod',
        approvalStatus: 'pending',
        application: { ...applicationRecord, current_step: 4 },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_stage',
            application_id: APPLICATION_ID,
            step_number: 4,
            status: 'scheduled',
            scheduled_at: '2026-11-08T09:00:00.000Z',
          }),
        );

        assertEquals(response.status, 409);
        const body = await response.json();
        assertEquals(body.success, false);
        assertEquals(
          mock.calls.some(
            (call) =>
              call.path === '/rest/v1/recruitment_pipeline_transactions' && call.method !== 'GET',
          ),
          false,
        );
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage rejects reviewer updates that skip the current step',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'slod',
        application: { ...applicationRecord, current_step: 2 },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_stage',
            application_id: APPLICATION_ID,
            step_number: 5,
            status: 'completed',
            confirmed_role: 'Usher',
          }),
        );

        assertEquals(response.status, 409);
        const body = await response.json();
        assertEquals(body.error, 'Stage update is out of sequence');
        assertEquals(
          mock.calls.some(
            (call) =>
              call.path === '/rest/v1/recruitment_pipeline_transactions' && call.method !== 'GET',
          ),
          false,
        );
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage rotates a pending endorsement token when resending',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch();
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({ action: 'resend_endorsement', application_id: APPLICATION_ID }),
        );

        assertEquals(response.status, 200);
        const tokenUpdate = mock.calls.find(
          (call) => call.path === '/rest/v1/approval_requests' && call.method === 'PATCH',
        );
        assertEquals(typeof (tokenUpdate?.body as Record<string, unknown>).access_token, 'string');
        const emailQueue = mock.calls.find((call) =>
          call.path.endsWith('/enqueue_email_notification'),
        );
        const emailPayload = (
          emailQueue?.body as { payload: { metadata: Record<string, unknown> } }
        ).payload;
        assertEquals(emailPayload.metadata.access_token, 'rotated-token');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage requires a confirmed role before completing evaluation',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'slod',
        approvalStatus: 'approved',
        application: { ...applicationRecord, current_step: 5 },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_stage',
            application_id: APPLICATION_ID,
            step_number: 5,
            status: 'completed',
          }),
        );

        assertEquals(response.status, 400);
        assertEquals(
          mock.calls.some(
            (call) =>
              call.path === '/rest/v1/recruitment_pipeline_transactions' && call.method !== 'GET',
          ),
          false,
        );
      } finally {
        mock.restore();
      }
    });
  },
);
