import { assertEquals } from '@std/assert';

import { handleProcessApprovalDecision } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const APPROVAL_ID = '33333333-3333-4333-8333-333333333333';
const VALID_TOKEN = 'test-approval-token-hex-string';
let requestNumber = 0;

async function withEnv(run: () => Promise<void>) {
  const names = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ALLOWED_ORIGINS', 'LOCAL_BROADCAST'];
  const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
  Deno.env.set('SUPABASE_URL', 'https://example.supabase.co');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  Deno.env.set('ALLOWED_ORIGINS', ORIGIN);
  Deno.env.set('LOCAL_BROADCAST', 'true');
  try {
    await run();
  } finally {
    for (const [name, value] of previous) {
      if (value === undefined) Deno.env.delete(name);
      else Deno.env.set(name, value);
    }
  }
}

function createRequest(body: unknown, authHeader?: string) {
  const headers: Record<string, string> = {
    origin: ORIGIN,
    'content-type': 'application/json',
    'x-forwarded-for': `203.0.113.${++requestNumber}`,
  };
  if (authHeader) {
    headers.authorization = authHeader;
  }
  return new Request('https://example.functions/process-approval-decision', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

function mockFetch(
  options: {
    approvalRecord?: unknown;
    formSubmission?: unknown;
    serviceExcuse?: unknown;
    rpcResult?: unknown;
    failRpc?: boolean;
  } = {},
) {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ path: string; url: URL; body: unknown; method: string }> = [];

  globalThis.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input.toString());
    const method = init?.method ?? 'GET';
    calls.push({
      path: url.pathname,
      url,
      method,
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : null,
    });

    if (url.pathname === '/rest/v1/approval_requests') {
      return Promise.resolve(
        Response.json(
          options.approvalRecord === undefined
            ? {
                id: APPROVAL_ID,
                entity_type: 'form_submission',
                entity_id: '44444444-4444-4444-8444-444444444444',
                status: 'pending',
                title: 'Volunteer Application',
                summary: 'New application from Jane Doe',
                requester_name: 'Jane Doe',
                requester_email: 'jane@example.com',
                assigned_to_email: 'lead@example.com',
                access_token: VALID_TOKEN,
                token_expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
                metadata: {},
                created_at: new Date().toISOString(),
              }
            : options.approvalRecord,
        ),
      );
    }

    if (url.pathname === '/rest/v1/form_submissions') {
      return Promise.resolve(
        Response.json(
          options.formSubmission ?? {
            id: '44444444-4444-4444-8444-444444444444',
            status: 'pending_approval',
            source: 'public',
            submitted_at: new Date().toISOString(),
            forms: { id: 'form-1', title: 'Volunteer Application' },
            form_submission_answers: [],
          },
        ),
      );
    }

    if (url.pathname === '/rest/v1/service_excuse_requests') {
      return Promise.resolve(
        Response.json(
          options.serviceExcuse ?? {
            id: '55555555-5555-4555-8555-555555555555',
            status: 'pending',
            start_date: '2026-11-01',
            end_date: '2026-11-29',
            is_long_leave: true,
            services: ['All Services'],
            reason: 'Extended family mission',
            users: { full_name: 'John Doe', email: 'john@example.com' },
          },
        ),
      );
    }

    if (url.pathname === '/rest/v1/rpc/apply_approval_decision') {
      if (options.failRpc) {
        return Promise.resolve(Response.json({ message: 'Database RPC failure' }, { status: 500 }));
      }
      return Promise.resolve(
        Response.json(
          options.rpcResult ?? {
            success: true,
            approval_id: APPROVAL_ID,
            status: 'approved',
          },
        ),
      );
    }

    return Promise.resolve(Response.json({}));
  };

  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test('process-approval-decision rejects missing token and approval_id', async () => {
  await withEnv(async () => {
    const res = await handleProcessApprovalDecision(
      createRequest({
        action: 'get_review_data',
      }),
    );
    assertEquals(res.status, 400);
    const body = await res.json();
    assertEquals(body.success, false);
  });
});

Deno.test(
  'process-approval-decision get_review_data returns 404 when request not found',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({ approvalRecord: null });
      try {
        const res = await handleProcessApprovalDecision(
          createRequest({
            action: 'get_review_data',
            token: 'nonexistent-token',
          }),
        );
        assertEquals(res.status, 404);
        const body = await res.json();
        assertEquals(body.success, false);
        assertEquals(body.error_code, 'NOT_FOUND');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'process-approval-decision get_review_data returns approval and entity details',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch();
      try {
        const res = await handleProcessApprovalDecision(
          createRequest({
            action: 'get_review_data',
            token: VALID_TOKEN,
          }),
        );
        assertEquals(res.status, 200);
        const body = await res.json();
        assertEquals(body.success, true);
        assertEquals(body.approval.title, 'Volunteer Application');
        assertEquals(body.approval.status, 'pending');
        assertEquals(body.approval.is_expired, false);
        assertEquals(body.entity_details.id, '44444444-4444-4444-8444-444444444444');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'process-approval-decision submit_decision rejects already decided requests with 409',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch({
        approvalRecord: {
          id: APPROVAL_ID,
          entity_type: 'form_submission',
          entity_id: '44444444-4444-4444-8444-444444444444',
          status: 'approved',
          title: 'Volunteer Application',
          requester_name: 'Jane Doe',
          access_token: VALID_TOKEN,
          token_expires_at: new Date(Date.now() + 86400000).toISOString(),
          decided_at: new Date().toISOString(),
        },
      });
      try {
        const res = await handleProcessApprovalDecision(
          createRequest({
            action: 'submit_decision',
            token: VALID_TOKEN,
            decision: 'approved',
          }),
        );
        assertEquals(res.status, 409);
        const body = await res.json();
        assertEquals(body.already_decided, true);
        assertEquals(body.status, 'approved');
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test('process-approval-decision submit_decision rejects expired tokens with 410', async () => {
  await withEnv(async () => {
    const mock = mockFetch({
      approvalRecord: {
        id: APPROVAL_ID,
        entity_type: 'form_submission',
        entity_id: '44444444-4444-4444-8444-444444444444',
        status: 'pending',
        title: 'Volunteer Application',
        requester_name: 'Jane Doe',
        access_token: VALID_TOKEN,
        token_expires_at: new Date(Date.now() - 86400000).toISOString(), // expired yesterday
      },
    });
    try {
      const res = await handleProcessApprovalDecision(
        createRequest({
          action: 'submit_decision',
          token: VALID_TOKEN,
          decision: 'approved',
        }),
      );
      assertEquals(res.status, 410);
      const body = await res.json();
      assertEquals(body.expired, true);
    } finally {
      mock.restore();
    }
  });
});

Deno.test(
  'process-approval-decision submit_decision successfully approves and triggers notification',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch();
      try {
        const res = await handleProcessApprovalDecision(
          createRequest({
            action: 'submit_decision',
            token: VALID_TOKEN,
            decision: 'approved',
            notes: 'Great background check and recommendations.',
            reviewer_email: 'leader@example.com',
          }),
        );
        assertEquals(res.status, 200);
        const body = await res.json();
        assertEquals(body.success, true);
        assertEquals(body.status, 'approved');

        // Verify RPC was called
        const rpcCall = mock.calls.find((c) => c.path === '/rest/v1/rpc/apply_approval_decision');
        assertEquals(Boolean(rpcCall), true);
      } finally {
        mock.restore();
      }
    });
  },
);

Deno.test(
  'process-approval-decision submit_decision successfully rejects request with notes',
  async () => {
    await withEnv(async () => {
      const mock = mockFetch();
      try {
        const res = await handleProcessApprovalDecision(
          createRequest({
            action: 'submit_decision',
            token: VALID_TOKEN,
            decision: 'rejected',
            notes: 'Application does not meet current scheduling criteria.',
            reviewer_email: 'leader@example.com',
          }),
        );
        assertEquals(res.status, 200);
        const body = await res.json();
        assertEquals(body.success, true);
        assertEquals(body.status, 'rejected');
      } finally {
        mock.restore();
      }
    });
  },
);
