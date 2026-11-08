import { assert, assertEquals } from '@std/assert';

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
  access_token: 'valid-applicant-token',
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
    transactions?: unknown;
  } = {},
) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; method: string; body: unknown; search?: string }> = [];

  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method ?? 'GET';
    let body: unknown = null;
    if (init?.body) {
      try {
        body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body;
      } catch {
        body = init.body;
      }
    }
    calls.push({ path: url.pathname, method, body, search: url.search });

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
    if (url.pathname === '/rest/v1/recruitment_pipeline_transactions') {
      if (method === 'POST' || method === 'PATCH') {
        return Promise.resolve(Response.json({ id: 'tx-mock-1' }));
      }
      const stepQuery = url.searchParams.get('step_number');
      const stepNum = stepQuery ? Number(stepQuery.replace('eq.', '')) : null;
      const allTx = (options.transactions ?? [
        { id: 'tx-1', attempt_number: 1, status: 'scheduled', notes: null },
      ]) as Record<string, unknown>[];
      const matching =
        stepNum !== null
          ? allTx.filter((t) => t.step_number === undefined || t.step_number === stepNum)
          : allTx;
      const acceptHeader =
        (init?.headers as Record<string, string> | undefined)?.['accept'] ||
        (init?.headers as Record<string, string> | undefined)?.['Accept'];
      if (acceptHeader?.includes('application/vnd.pgrst.object+json')) {
        return Promise.resolve(Response.json(matching[0] ?? null));
      }
      return Promise.resolve(Response.json(matching));
    }
    if (url.pathname === '/rest/v1/app_notifications') {
      return Promise.resolve(Response.json({ id: 'mock-notif-1' }));
    }
    if (url.pathname === '/rest/v1/app_notification_recipients') {
      return Promise.resolve(Response.json({ id: 'mock-recip-1' }));
    }
    if (url.pathname === '/rest/v1/approval_requests') {
      if (method === 'PATCH') {
        return Promise.resolve(Response.json({ id: APPROVAL_ID, access_token: 'rotated-token' }));
      }
      if (method === 'POST') {
        return Promise.resolve(
          Response.json({ id: 'new-approval-123', access_token: 'new-access-token' }),
        );
      }
      const acceptHeader =
        (init?.headers as Record<string, string> | undefined)?.['accept'] ||
        (init?.headers as Record<string, string> | undefined)?.['Accept'];
      if (acceptHeader?.includes('application/vnd.pgrst.object+json')) {
        return Promise.resolve(
          Response.json({ id: APPROVAL_ID, status: options.approvalStatus ?? 'pending' }),
        );
      }
      return Promise.resolve(
        Response.json([{ id: APPROVAL_ID, status: options.approvalStatus ?? 'pending' }]),
      );
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
    if (url.pathname.startsWith('/storage/v1/object/member_avatars/')) {
      return Promise.resolve(
        Response.json({ Key: url.pathname.slice('/storage/v1/object/'.length) }),
      );
    }
    if (url.pathname === '/rest/v1/recruitment_step_notes') {
      return Promise.resolve(
        Response.json({ id: 'note-mock-1', created_at: new Date().toISOString() }),
      );
    }
    if (url.pathname === '/rest/v1/users') {
      return Promise.resolve(
        Response.json({
          id: USER_ID,
          full_name: 'Test Reviewer',
          nickname: 'Reviewer',
          avatar_object_key: null,
        }),
      );
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

Deno.test(
  'update-recruitment-stage completes Step 8 RFID assignment and advances to Step 9',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        application: { ...applicationRecord, current_step: 8 },
        adminRole: 'admin',
        approvalStatus: 'approved',
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_stage',
            application_id: APPLICATION_ID,
            step_number: 8,
            status: 'completed',
            assigned_rfid_member_id: '1000123',
          }),
        );

        assertEquals(response.status, 200);
        const result = await response.json();
        assertEquals(result.current_step, 9);
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
  'update-recruitment-stage creates a new endorsement and cancels pending when request_endorsement is called',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({ adminRole: 'admin' });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'request_endorsement',
            application_id: APPLICATION_ID,
            leader_name: 'New Leader',
            leader_email: 'newleader@example.com',
            leader_contact_number: '+639170001111',
            notes: 'Applicant transferred to new group',
          }),
        );

        assertEquals(response.status, 200);
        const body = (await response.json()) as { success: boolean; approval_id: string };
        assertEquals(body.success, true);
        assertEquals(body.approval_id, 'new-approval-123');

        // Verify pending request was cancelled
        const cancelCall = mock.calls.find(
          (call) =>
            call.path === '/rest/v1/approval_requests' &&
            call.method === 'PATCH' &&
            (call.body as Record<string, unknown>).status === 'cancelled',
        );
        assertEquals(Boolean(cancelCall), true);

        // Verify new approval was created with assigned email
        const createApprovalCall = mock.calls.find(
          (call) =>
            call.path === '/rest/v1/approval_requests' &&
            call.method === 'POST' &&
            (call.body as Record<string, unknown>).assigned_to_email === 'newleader@example.com',
        );
        assertEquals(Boolean(createApprovalCall), true);

        // Verify application was updated with new leader info and new approval ID
        const appUpdateCall = mock.calls.find(
          (call) =>
            call.path === '/rest/v1/recruitment_applications' &&
            call.method === 'PATCH' &&
            (call.body as Record<string, unknown>).dgroup_approval_id === 'new-approval-123',
        );
        assertEquals(Boolean(appUpdateCall), true);

        // Verify email notification was enqueued
        const emailQueueCall = mock.calls.find((call) =>
          call.path.endsWith('/enqueue_email_notification'),
        );
        assertEquals(Boolean(emailQueueCall), true);

        // Verify audit note was recorded
        const noteCall = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_step_notes' && call.method === 'POST',
        );
        assertEquals(Boolean(noteCall), true);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage allows changing dgroup leader when applicant is already endorsed',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        approvalStatus: 'approved',
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'request_endorsement',
            application_id: APPLICATION_ID,
            leader_name: 'Successor Leader',
            leader_email: 'successor@example.com',
            leader_contact_number: '+639179998888',
            notes: 'Transferring to different pastoral group',
          }),
        );

        assertEquals(response.status, 200);
        const body = (await response.json()) as { success: boolean; approval_id: string };
        assertEquals(body.success, true);
        assertEquals(body.approval_id, 'new-approval-123');

        // Verify application updated with new approval ID
        const appUpdateCall = mock.calls.find(
          (call) =>
            call.path === '/rest/v1/recruitment_applications' &&
            call.method === 'PATCH' &&
            (call.body as Record<string, unknown>).dgroup_approval_id === 'new-approval-123',
        );
        assertEquals(Boolean(appUpdateCall), true);

        // Verify fresh endorsement email was dispatched to new leader
        const emailQueueCall = mock.calls.find((call) =>
          call.path.endsWith('/enqueue_email_notification'),
        );
        assertEquals(Boolean(emailQueueCall), true);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test('update-recruitment-stage rejects request_endorsement from non-reviewers', async () => {
  await withEnv(async () => {
    const mock = mockFetch({ adminRole: null });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'request_endorsement',
          application_id: APPLICATION_ID,
          leader_name: 'New Leader',
          leader_email: 'newleader@example.com',
        }),
      );

      assertEquals(response.status, 403);
    } finally {
      mock.restore();
    }
  });
});

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

Deno.test('update-recruitment-stage accepts scheduled_at with timezone offset', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: 'admin',
      approvalStatus: 'approved',
      application: { ...applicationRecord, current_step: 3 },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'update_stage',
          application_id: APPLICATION_ID,
          step_number: 3,
          status: 'scheduled',
          scheduled_at: '2026-11-08T09:00:00+08:00',
        }),
      );

      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(body.success, true);
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage supports repeat_step on step 2 (Interview)', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: 'admin',
      application: { ...applicationRecord, current_step: 2 },
      transactions: [
        { id: 'tx-int-1', attempt_number: 1, status: 'scheduled', notes: 'First round done' },
      ],
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'repeat_step',
          application_id: APPLICATION_ID,
          step_number: 2,
          scheduled_at: '2026-11-15T10:00:00+08:00',
          notes: 'Candidate needs additional pastoral alignment',
          confirmed_role: 'Usher',
        }),
      );

      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(body.success, true);
      assertEquals(body.current_step, 2);
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'update-recruitment-stage supports return_to_interview from step 3 (Orientation)',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 3 },
        transactions: [
          { id: 'tx-int-1', attempt_number: 1, status: 'completed', notes: 'Initial interview' },
        ],
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'return_to_interview',
            application_id: APPLICATION_ID,
            step_number: 3,
            scheduled_at: '2026-11-16T14:00:00+08:00',
            notes: 'Returned before orientation for re-interview',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.current_step, 2);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test('update-recruitment-stage archives an applicant and records note', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: 'admin',
      application: { ...applicationRecord, current_step: 3, status: 'active' },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'archive_applicant',
          application_id: APPLICATION_ID,
          notes: 'Candidate paused for personal reasons',
        }),
      );

      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(body.success, true);
      assertEquals(body.status, 'archived');

      // Verify note was inserted into current step recruitment_step_notes
      const noteCall = mock.calls.find(
        (call) => call.path === '/rest/v1/recruitment_step_notes' && call.method === 'POST',
      );
      assertEquals(Boolean(noteCall), true);
      assertEquals(
        (noteCall?.body as Record<string, unknown>).content,
        'Archived: Candidate paused for personal reasons',
      );
      assertEquals((noteCall?.body as Record<string, unknown>).step_number, 3);
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage rejects archive_applicant without reason notes', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: 'admin',
      application: { ...applicationRecord, current_step: 3, status: 'active' },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'archive_applicant',
          application_id: APPLICATION_ID,
          notes: '',
        }),
      );

      assertEquals(response.status, 400);
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'update-recruitment-stage rejects archive_applicant when applicant is deployed',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 9, status: 'deployed' },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'archive_applicant',
            application_id: APPLICATION_ID,
            notes: 'Attempting to archive deployed',
          }),
        );

        assertEquals(response.status, 400);
        const body = await response.json();
        assertEquals(body.error, 'Deployed applicants cannot be archived');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage updates applicant profile and recomputes full_name',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 2, status: 'active' },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_profile',
            application_id: APPLICATION_ID,
            profile: {
              first_name: 'UpdatedFirst',
              middle_name: 'Mid',
              last_name: 'UpdatedLast',
              nickname: 'NewNick',
              email: 'updated.applicant@example.com',
              phone: '09191112233',
              life_stage: 'Married',
              personal_details: {
                occupation: 'Software Engineer',
              },
              emergency_contact: {
                name: 'Jane Doe',
                phone: '09194445566',
                relation: 'Spouse',
              },
            },
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);

        // Verify update payload sent to database
        const updateCall = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'PATCH',
        );
        assertEquals(Boolean(updateCall), true);
        const updateBody = updateCall?.body as Record<string, unknown>;
        assertEquals(updateBody.first_name, 'UpdatedFirst');
        assertEquals(updateBody.middle_name, 'Mid');
        assertEquals(updateBody.last_name, 'UpdatedLast');
        assertEquals(updateBody.full_name, 'UpdatedFirst Mid UpdatedLast');
        assertEquals(updateBody.nickname, 'NewNick');
        assertEquals(updateBody.email, 'updated.applicant@example.com');
        assertEquals(updateBody.phone, '09191112233');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage restores an archived applicant to active and records note',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 3, status: 'archived' },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'restore_applicant',
            application_id: APPLICATION_ID,
            notes: 'Candidate resuming recruitment',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.status, 'active');

        const noteCall = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_step_notes' && call.method === 'POST',
        );
        assertEquals(Boolean(noteCall), true);
        assertEquals(
          (noteCall?.body as Record<string, unknown>).content,
          'Restored: Candidate resuming recruitment',
        );
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage allows reviewers to add a recruiter note at any time',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'vmt',
        application: { ...applicationRecord, current_step: 3 },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'add_note',
            application_id: APPLICATION_ID,
            step_number: 2,
            notes: 'Candidate showed great enthusiasm during conversation.',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.note_id, 'note-mock-1');

        const noteInsert = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_step_notes' && call.method === 'POST',
        );
        assertEquals(Boolean(noteInsert), true);
        const noteBody = noteInsert?.body as Record<string, unknown>;
        assertEquals(noteBody.application_id, APPLICATION_ID);
        assertEquals(noteBody.step_number, 2);
        assertEquals(noteBody.content, 'Candidate showed great enthusiasm during conversation.');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test('update-recruitment-stage rejects add_note when notes content is blank', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: 'admin',
      application: { ...applicationRecord, current_step: 3 },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'add_note',
          application_id: APPLICATION_ID,
          step_number: 2,
          notes: '   ',
        }),
      );

      assertEquals(response.status, 400);
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage rejects add_note from non-reviewers', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: null,
      application: { ...applicationRecord, current_step: 3 },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'add_note',
          application_id: APPLICATION_ID,
          step_number: 2,
          notes: 'Attempting to add note without reviewer role',
        }),
      );

      assertEquals(response.status, 403);
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage accepts scheduled_at with timezone offset', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: 'admin',
      approvalStatus: 'approved',
      application: { ...applicationRecord, current_step: 3 },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'update_stage',
          application_id: APPLICATION_ID,
          step_number: 3,
          status: 'scheduled',
          scheduled_at: '2026-11-08T09:00:00+08:00',
        }),
      );

      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(body.success, true);
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage supports repeat_step on step 2 (Interview)', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: 'admin',
      application: { ...applicationRecord, current_step: 2 },
      transactions: [
        { id: 'tx-int-1', attempt_number: 1, status: 'scheduled', notes: 'First round done' },
      ],
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'repeat_step',
          application_id: APPLICATION_ID,
          step_number: 2,
          scheduled_at: '2026-11-15T10:00:00+08:00',
          notes: 'Candidate needs additional pastoral alignment',
          confirmed_role: 'Usher',
        }),
      );

      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(body.success, true);
      assertEquals(body.current_step, 2);
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'update-recruitment-stage supports return_to_interview from step 3 (Orientation)',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 3 },
        transactions: [
          { id: 'tx-int-1', attempt_number: 1, status: 'completed', notes: 'Initial interview' },
        ],
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'return_to_interview',
            application_id: APPLICATION_ID,
            step_number: 3,
            scheduled_at: '2026-11-16T14:00:00+08:00',
            notes: 'Returned before orientation for re-interview',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.current_step, 2);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test('update-recruitment-stage archives an applicant and records note', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: 'admin',
      application: { ...applicationRecord, current_step: 3, status: 'active' },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'archive_applicant',
          application_id: APPLICATION_ID,
          notes: 'Candidate paused for personal reasons',
        }),
      );

      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(body.success, true);
      assertEquals(body.status, 'archived');

      // Verify note was inserted into current step recruitment_step_notes
      const noteCall = mock.calls.find(
        (call) => call.path === '/rest/v1/recruitment_step_notes' && call.method === 'POST',
      );
      assertEquals(Boolean(noteCall), true);
      assertEquals(
        (noteCall?.body as Record<string, unknown>).content,
        'Archived: Candidate paused for personal reasons',
      );
      assertEquals((noteCall?.body as Record<string, unknown>).step_number, 3);
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage rejects archive_applicant without reason notes', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: 'admin',
      application: { ...applicationRecord, current_step: 3, status: 'active' },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'archive_applicant',
          application_id: APPLICATION_ID,
          notes: '',
        }),
      );

      assertEquals(response.status, 400);
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'update-recruitment-stage rejects archive_applicant when applicant is deployed',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 9, status: 'deployed' },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'archive_applicant',
            application_id: APPLICATION_ID,
            notes: 'Attempting to archive deployed',
          }),
        );

        assertEquals(response.status, 400);
        const body = await response.json();
        assertEquals(body.error, 'Deployed applicants cannot be archived');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage updates applicant profile and recomputes full_name',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 2, status: 'active' },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_profile',
            application_id: APPLICATION_ID,
            profile: {
              first_name: 'UpdatedFirst',
              middle_name: 'Mid',
              last_name: 'UpdatedLast',
              nickname: 'NewNick',
              email: 'updated.applicant@example.com',
              phone: '09191112233',
              life_stage: 'Married',
              personal_details: {
                occupation: 'Software Engineer',
              },
              emergency_contact: {
                name: 'Jane Doe',
                phone: '09194445566',
                relation: 'Spouse',
              },
            },
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);

        // Verify update payload sent to database
        const updateCall = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'PATCH',
        );
        assertEquals(Boolean(updateCall), true);
        const updateBody = updateCall?.body as Record<string, unknown>;
        assertEquals(updateBody.first_name, 'UpdatedFirst');
        assertEquals(updateBody.middle_name, 'Mid');
        assertEquals(updateBody.last_name, 'UpdatedLast');
        assertEquals(updateBody.full_name, 'UpdatedFirst Mid UpdatedLast');
        assertEquals(updateBody.nickname, 'NewNick');
        assertEquals(updateBody.email, 'updated.applicant@example.com');
        assertEquals(updateBody.phone, '09191112233');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage restores an archived applicant to active and records note',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 3, status: 'archived' },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'restore_applicant',
            application_id: APPLICATION_ID,
            notes: 'Candidate resuming recruitment',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.status, 'active');

        const noteCall = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_step_notes' && call.method === 'POST',
        );
        assertEquals(Boolean(noteCall), true);
        assertEquals(
          (noteCall?.body as Record<string, unknown>).content,
          'Restored: Candidate resuming recruitment',
        );
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage allows reviewers to add a recruiter note at any time',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'vmt',
        application: { ...applicationRecord, current_step: 3 },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'add_note',
            application_id: APPLICATION_ID,
            step_number: 2,
            notes: 'Candidate showed great enthusiasm during conversation.',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.note_id, 'note-mock-1');

        const noteInsert = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_step_notes' && call.method === 'POST',
        );
        assertEquals(Boolean(noteInsert), true);
        const noteBody = noteInsert?.body as Record<string, unknown>;
        assertEquals(noteBody.application_id, APPLICATION_ID);
        assertEquals(noteBody.step_number, 2);
        assertEquals(noteBody.content, 'Candidate showed great enthusiasm during conversation.');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test('update-recruitment-stage rejects add_note when notes content is blank', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: 'admin',
      application: { ...applicationRecord, current_step: 3 },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'add_note',
          application_id: APPLICATION_ID,
          step_number: 2,
          notes: '   ',
        }),
      );

      assertEquals(response.status, 400);
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage rejects add_note from non-reviewers', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      adminRole: null,
      application: { ...applicationRecord, current_step: 3 },
    });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'add_note',
          application_id: APPLICATION_ID,
          step_number: 2,
          notes: 'Attempting to add note without reviewer role',
        }),
      );

      assertEquals(response.status, 403);
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage allows a reviewer to upload applicant avatar', async () => {
  await withEnv(async () => {
    const mock = mockFetch({ adminRole: 'admin' });
    try {
      const validBytes = new Uint8Array([0xff, 0xd8, 0x00, 0xff, 0xd9]);
      const base64 = btoa(String.fromCharCode(...validBytes));
      const validJpegDataUrl = `data:image/jpeg;base64,${base64}`;

      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'upload_avatar',
          application_id: APPLICATION_ID,
          image_base64: validJpegDataUrl,
        }),
      );

      assertEquals(response.status, 200);
      const result = await response.json();
      assertEquals(result.success, true);
      assertEquals(result.avatar_object_key, `avatars/recruitment/${APPLICATION_ID}.jpg`);
      assert(mock.calls.some((call) => call.path.startsWith('/storage/v1/object/member_avatars/')));
      assert(
        mock.calls.some(
          (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'PATCH',
        ),
      );
    } finally {
      mock.restore();
    }
  });
});

Deno.test('update-recruitment-stage rejects upload_avatar from non-reviewers', async () => {
  await withEnv(async () => {
    const mock = mockFetch({ adminRole: null });
    try {
      const response = await handleUpdateRecruitmentStage(
        createRequest({
          action: 'upload_avatar',
          application_id: APPLICATION_ID,
          image_base64: 'data:image/jpeg;base64,abcd',
        }),
      );

      assertEquals(response.status, 403);
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'update-recruitment-stage supports return_to_observation from step 5 (Evaluation) even without step 5 session',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        approvalStatus: 'approved',
        application: { ...applicationRecord, current_step: 5 },
        transactions: [
          {
            id: 'tx-obs-1',
            step_number: 4,
            attempt_number: 1,
            status: 'completed',
            notes: 'Initial observation',
          },
        ],
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'return_to_observation',
            application_id: APPLICATION_ID,
            step_number: 5,
            scheduled_at: '2026-11-23T14:00:00+08:00',
            notes: 'Requires another observation session before evaluation',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.current_step, 4);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage supports return_to_observation from step 5 with pending status when unscheduled',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        approvalStatus: 'approved',
        application: { ...applicationRecord, current_step: 5 },
        transactions: [
          {
            id: 'tx-obs-1',
            step_number: 4,
            attempt_number: 1,
            status: 'completed',
            notes: 'Initial observation',
          },
        ],
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'return_to_observation',
            application_id: APPLICATION_ID,
            step_number: 5,
            notes: 'Reverting candidate to Step 4 observation queue',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.current_step, 4);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage rejects completing a coaching step before it is scheduled',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 2 },
        transactions: [], // no transaction scheduled yet
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_stage',
            application_id: APPLICATION_ID,
            step_number: 2,
            status: 'completed',
            confirmed_role: 'Usher',
            notes: 'Completed interview notes',
          }),
        );

        assertEquals(response.status, 409);
        const body = await response.json();
        assertEquals(body.success, false);
        assertEquals(body.error, 'Step 2 must be scheduled before it can be completed');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage allows completing a coaching step when it was scheduled',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 2 },
        transactions: [
          {
            id: 'tx-int-sched-1',
            step_number: 2,
            attempt_number: 1,
            status: 'scheduled',
            scheduled_at: '2026-11-15T10:00:00+08:00',
            notes: null,
          },
        ],
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_stage',
            application_id: APPLICATION_ID,
            step_number: 2,
            status: 'completed',
            confirmed_role: 'Usher',
            notes: 'Completed interview notes',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.current_step, 3);

        const noteInsertCall = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_step_notes' && call.method === 'POST',
        );
        assertEquals(Boolean(noteInsertCall), true);
        const payload =
          typeof noteInsertCall?.body === 'string'
            ? JSON.parse(noteInsertCall.body)
            : (noteInsertCall?.body as Record<string, unknown>) || {};
        assertEquals(payload.content, 'Completed interview notes');
        assertEquals(payload.step_number, 2);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage cancels an active schedule, resets transaction to pending, and records cancellation note',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 2 },
        transactions: [
          {
            id: 'tx-scheduled-step-2',
            application_id: APPLICATION_ID,
            step_number: 2,
            step_key: 'interview',
            attempt_number: 1,
            status: 'scheduled',
            transaction_type: 'scheduled',
            scheduled_at: '2026-11-08T09:00:00+08:00',
            assigned_reviewer_id: USER_ID,
            assigned_reviewer_name: 'Coach Reviewer',
          },
        ],
      });

      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'cancel_schedule',
            application_id: APPLICATION_ID,
            step_number: 2,
            notes: 'Candidate has a family emergency',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);
        assertEquals(body.status, 'pending');
        assertEquals(body.scheduled_at, null);
        assertEquals(body.assigned_reviewer_id, null);
        assertEquals(body.assigned_reviewer_name, null);

        // Verify transaction was updated to pending with null scheduled_at and unassigned reviewer
        const txUpdateCall = mock.calls.find(
          (call) =>
            call.path === '/rest/v1/recruitment_pipeline_transactions' && call.method === 'PATCH',
        );
        assertEquals(Boolean(txUpdateCall), true);
        const txBody =
          typeof txUpdateCall?.body === 'string'
            ? JSON.parse(txUpdateCall.body)
            : (txUpdateCall?.body as Record<string, unknown>) || {};
        assertEquals(txBody.status, 'pending');
        assertEquals(txBody.scheduled_at, null);
        assertEquals(txBody.assigned_reviewer_id, null);
        assertEquals(txBody.assigned_reviewer_name, null);
        assertEquals(txBody.notes, 'Schedule cancelled: Candidate has a family emergency');

        // Verify cancellation note was inserted into recruitment_step_notes
        const noteInsertCall = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_step_notes' && call.method === 'POST',
        );
        assertEquals(Boolean(noteInsertCall), true);
        const noteBody =
          typeof noteInsertCall?.body === 'string'
            ? JSON.parse(noteInsertCall.body)
            : (noteInsertCall?.body as Record<string, unknown>) || {};
        assertEquals(noteBody.content, 'Schedule cancelled: Candidate has a family emergency');
        assertEquals(noteBody.step_number, 2);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage rejects cancel_schedule without notes or on non-scheduled step',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 2 },
        transactions: [
          {
            id: 'tx-completed-step-2',
            application_id: APPLICATION_ID,
            step_number: 2,
            status: 'completed',
          },
        ],
      });

      try {
        // Missing notes
        const badReq = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'cancel_schedule',
            application_id: APPLICATION_ID,
            step_number: 2,
          }),
        );
        assertEquals(badReq.status, 400);

        // Already completed step
        const conflictReq = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'cancel_schedule',
            application_id: APPLICATION_ID,
            step_number: 2,
            notes: 'Some reason',
          }),
        );
        assertEquals(conflictReq.status, 409);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage does not create duplicate Step 6 skipped transaction when confirming a non-Prayer Coach role',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 2, confirmed_role: null },
        transactions: [
          {
            id: 'tx-int-2',
            step_number: 2,
            attempt_number: 1,
            status: 'scheduled',
            notes: null,
          },
          {
            id: 'tx-onboard-6',
            step_number: 6,
            attempt_number: 1,
            status: 'skipped',
            notes: null,
          },
        ],
      });

      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_stage',
            application_id: APPLICATION_ID,
            step_number: 2,
            status: 'completed',
            confirmed_role: 'Usher',
            notes: 'Candidate confirmed for Usher role',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);

        // Verify that NO insert or update calls were made to Step 6
        const step6Calls = mock.calls.filter((call) => {
          if (call.path !== '/rest/v1/recruitment_pipeline_transactions') return false;
          if (call.method === 'GET') return false;
          const bodyPayload = (call.body ?? {}) as Record<string, unknown>;
          return bodyPayload.step_number === 6;
        });
        assertEquals(step6Calls.length, 0);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage updates Step 6 in place when switching confirmed role from non-Prayer Coach to Prayer Coach',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        application: { ...applicationRecord, current_step: 2, confirmed_role: 'Usher' },
        transactions: [
          {
            id: 'tx-int-2',
            step_number: 2,
            attempt_number: 1,
            status: 'scheduled',
            notes: null,
          },
          {
            id: 'tx-onboard-6',
            step_number: 6,
            attempt_number: 1,
            status: 'skipped',
            notes: null,
          },
        ],
      });

      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_stage',
            application_id: APPLICATION_ID,
            step_number: 2,
            status: 'completed',
            confirmed_role: 'Prayer Coach',
            notes: 'Candidate switched to Prayer Coach',
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);

        // Verify that Step 6 was updated in place via PATCH on existing id
        const step6Patch = mock.calls.find(
          (call) =>
            call.path === '/rest/v1/recruitment_pipeline_transactions' &&
            call.method === 'PATCH' &&
            call.search?.includes('id=eq.tx-onboard-6'),
        );
        assertEquals(Boolean(step6Patch), true);
        const payload = (step6Patch?.body ?? {}) as Record<string, unknown>;
        assertEquals(payload.status, 'pending');
        assertEquals(payload.transaction_type, 'scheduled');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage allows scheduling a session with assigned_reviewer_id as null (unassigned)',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        approvalStatus: 'approved',
        application: { ...applicationRecord, current_step: 4 },
        transactions: [
          {
            id: 'tx-obs-sched-1',
            step_number: 4,
            attempt_number: 1,
            status: 'pending',
            scheduled_at: null,
            assigned_reviewer_id: null,
            assigned_reviewer_name: null,
          },
        ],
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_stage',
            application_id: APPLICATION_ID,
            step_number: 4,
            status: 'scheduled',
            scheduled_at: '2026-11-22T09:00:00+08:00',
            assigned_reviewer_id: null,
            assigned_reviewer_name: null,
          }),
        );

        assertEquals(response.status, 200);
        const body = await response.json();
        assertEquals(body.success, true);

        const patchCall = mock.calls.find(
          (call) =>
            call.path === '/rest/v1/recruitment_pipeline_transactions' &&
            call.method === 'PATCH' &&
            call.search?.includes('id=eq.tx-obs-sched-1'),
        );
        assertEquals(Boolean(patchCall), true);
        const payload = (patchCall?.body ?? {}) as Record<string, unknown>;
        assertEquals(payload.status, 'scheduled');
        assertEquals(payload.assigned_reviewer_id, null);
        assertEquals(payload.assigned_reviewer_name, null);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage rejects completing Step 4 without an assigned reviewer',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        adminRole: 'admin',
        approvalStatus: 'approved',
        application: { ...applicationRecord, current_step: 4 },
        transactions: [
          {
            id: 'tx-obs-sched-2',
            step_number: 4,
            attempt_number: 1,
            status: 'scheduled',
            scheduled_at: '2026-11-22T09:00:00+08:00',
            assigned_reviewer_id: null,
            assigned_reviewer_name: null,
          },
        ],
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest({
            action: 'update_stage',
            application_id: APPLICATION_ID,
            step_number: 4,
            status: 'completed',
            assigned_reviewer_id: null,
            assigned_reviewer_name: null,
          }),
        );

        assertEquals(response.status, 400);
        const body = await response.json();
        assertEquals(body.success, false);
        assertEquals(
          body.error,
          'An assigned reviewer / coach is required before completing Step 4',
        );
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage allows applicant to save commitments using magic link token without auth header',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        application: {
          ...applicationRecord,
          auth_user_id: null,
          access_token: 'applicant-magic-token',
        },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest(
            {
              action: 'save_commitments',
              application_id: APPLICATION_ID,
              token: 'applicant-magic-token',
              service_commitments: { first_sunday: ['9AM'] },
            },
            USER_ID,
            null, // No authorization header
          ),
        );

        assertEquals(response.status, 200);
        const update = mock.calls.find(
          (call) => call.path === '/rest/v1/recruitment_applications' && call.method === 'PATCH',
        );
        assertEquals((update?.body as Record<string, unknown>).service_commitments, {
          first_sunday: ['9AM'],
        });
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'update-recruitment-stage rejects reviewer actions when requested with applicant token',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        application: {
          ...applicationRecord,
          auth_user_id: null,
          access_token: 'applicant-magic-token',
        },
      });
      try {
        const response = await handleUpdateRecruitmentStage(
          createRequest(
            {
              action: 'update_stage',
              application_id: APPLICATION_ID,
              token: 'applicant-magic-token',
              step_number: 2,
              status: 'completed',
            },
            USER_ID,
            null, // No authorization header
          ),
        );

        assertEquals(response.status, 403);
      } finally {
        mock.restore();
      }
    });
  },
);
