import { assertEquals } from '@std/assert';

import { handleSubmitFormSubmission } from '../handler.ts';

const ORIGIN = 'https://app.example.com';
const FORM_ID = '11111111-1111-4111-8111-111111111111';
const FIELD_ID = '22222222-2222-4222-8222-222222222222';
const SUBMISSION_ID = '33333333-3333-4333-8333-333333333333';
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

function request(body: unknown) {
  return new Request('https://example.functions/submit-form-submission', {
    method: 'POST',
    headers: {
      origin: ORIGIN,
      'content-type': 'application/json',
      'x-forwarded-for': `203.0.113.${++requestNumber}`,
    },
    body: JSON.stringify(body),
  });
}

function payload(responses: Record<string, unknown> = { note: 'Hello' }) {
  return {
    form_slug: 'feedback',
    responses,
    idempotency_key: 'request-1',
    public_registrant_info: { email: 'guest@example.com' },
  };
}

const FIELD = {
  id: FIELD_ID,
  field_key: 'note',
  label: 'Note',
  field_type: 'text',
  field_applicability: 'all',
  is_required: true,
  options: [],
  validation_rules: {},
};

function mockFetch(
  options: {
    form?: unknown;
    fields?: unknown[];
    user?: unknown;
    existing?: unknown;
    failPath?: string;
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
    if (url.pathname === options.failPath)
      return Promise.resolve(Response.json({ message: 'write failed' }, { status: 500 }));
    if (url.pathname === '/rest/v1/forms')
      return Promise.resolve(
        Response.json(
          options.form === undefined
            ? {
                id: FORM_ID,
                duplicate_policy: 'allow_multiple',
                audience: 'public',
                status: 'published',
              }
            : options.form,
        ),
      );
    if (url.pathname === '/rest/v1/users')
      return Promise.resolve(Response.json(options.user ?? { id: 'member-1' }));
    if (url.pathname === '/rest/v1/form_fields')
      return Promise.resolve(Response.json(options.fields ?? [FIELD]));
    if (url.pathname === '/rest/v1/form_submissions' && method === 'GET')
      return Promise.resolve(Response.json(options.existing ?? null));
    if (url.pathname === '/rest/v1/form_submissions' && method === 'POST')
      return Promise.resolve(Response.json({ id: SUBMISSION_ID }));
    if (url.pathname === '/rest/v1/form_submissions' && method === 'PATCH')
      return Promise.resolve(Response.json({ id: SUBMISSION_ID }));
    if (url.pathname === '/rest/v1/approval_requests' && method === 'POST')
      return Promise.resolve(Response.json({ id: 'approval-1', access_token: 'token-abc' }));
    if (url.pathname === '/rest/v1/approval_requests' && method === 'PATCH')
      return Promise.resolve(Response.json({}));
    if (url.pathname === '/rest/v1/form_submission_answers' && method === 'DELETE')
      return Promise.resolve(new Response(null, { status: 200 }));
    if (url.pathname === '/rest/v1/form_submission_answers' && method === 'POST')
      return Promise.resolve(new Response(null, { status: 201 }));
    return Promise.resolve(new Response('Unexpected request', { status: 500 }));
  };
  return {
    calls,
    restore: () => {
      globalThis.fetch = originalFetch;
    },
  };
}

Deno.test(
  'submit-form-submission rejects missing idempotency keys without database access',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch();
      try {
        const response = await handleSubmitFormSubmission(
          request({ ...payload(), idempotency_key: '' }),
        );
        assertEquals(response.status, 400);
        assertEquals((await response.json()).error_code, 'INVALID_REQUEST');
        assertEquals(fetchMock.calls, []);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('submit-form-submission rejects missing and failed form lookups', async () => {
  await withEnv(async () => {
    for (const options of [{ form: null }, { failPath: '/rest/v1/forms' }]) {
      const fetchMock = mockFetch(options);
      try {
        const response = await handleSubmitFormSubmission(request(payload()));
        assertEquals(
          (await response.json()).error_code,
          options.form === null ? 'FORM_NOT_FOUND' : 'FORM_LOOKUP_FAILED',
        );
        assertEquals(
          fetchMock.calls.some((call) => call.path === '/rest/v1/form_submissions'),
          false,
        );
      } finally {
        fetchMock.restore();
      }
    }
  });
});

Deno.test(
  'submit-form-submission validates required fields before creating a submission',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch();
      try {
        const response = await handleSubmitFormSubmission(request(payload({})));
        assertEquals(response.status, 200);
        assertEquals((await response.json()).error_code, 'VALIDATION_FAILED');
        assertEquals(
          fetchMock.calls.some((call) => call.path === '/rest/v1/form_submissions'),
          false,
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test('submit-form-submission creates a public submission and saves its answers', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch();
    try {
      const response = await handleSubmitFormSubmission(request(payload()));
      assertEquals(response.status, 200);
      assertEquals(await response.json(), {
        success: true,
        submission_id: SUBMISSION_ID,
        status: 'submitted',
        is_new: true,
        message: 'Form submitted successfully',
      });
      const insert = fetchMock.calls.find((call) => call.path === '/rest/v1/form_submissions');
      assertEquals(insert?.body, {
        form_id: FORM_ID,
        user_id: null,
        public_registrant_info: { email: 'guest@example.com' },
        idempotency_key: 'request-1',
        status: 'submitted',
        source: 'public',
      });
      const answers = fetchMock.calls.find(
        (call) => call.path === '/rest/v1/form_submission_answers',
      );
      assertEquals(answers?.body, [
        { submission_id: SUBMISSION_ID, form_field_id: FIELD_ID, answer_text: 'Hello' },
      ]);
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test('submit-form-submission reports answer insert errors', async () => {
  await withEnv(async () => {
    const fetchMock = mockFetch({ failPath: '/rest/v1/form_submission_answers' });
    try {
      const response = await handleSubmitFormSubmission(request(payload()));
      assertEquals(response.status, 500);
      assertEquals((await response.json()).error_code, 'ANSWERS_INSERT_FAILED');
    } finally {
      fetchMock.restore();
    }
  });
});

Deno.test(
  'submit-form-submission blocks duplicate member submissions before insertion',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch({
        form: { id: FORM_ID, duplicate_policy: 'block', audience: 'members', status: 'published' },
        existing: { id: SUBMISSION_ID },
      });
      try {
        const response = await handleSubmitFormSubmission(
          request({ ...payload(), member_id: 'M-123' }),
        );
        assertEquals((await response.json()).error_code, 'duplicate_blocked');
        const memberLookup = fetchMock.calls.find((call) => call.path === '/rest/v1/users');
        assertEquals(memberLookup?.url.searchParams.get('member_id'), 'eq.M-123');
        assertEquals(
          fetchMock.calls.some(
            (call) => call.path === '/rest/v1/form_submissions' && call.method === 'POST',
          ),
          false,
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'submit-form-submission creates approval request when form requires approval',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch({
        form: {
          id: FORM_ID,
          title: 'Volunteer Application',
          duplicate_policy: 'allow_multiple',
          audience: 'public',
          status: 'published',
          metadata: {
            requires_approval: true,
            approver_email: 'leader@example.com',
          },
        },
      });
      try {
        const response = await handleSubmitFormSubmission(
          request({
            ...payload(),
            public_registrant_info: {
              first_name: 'John',
              last_name: 'Smith',
              email: 'john@example.com',
            },
          }),
        );
        assertEquals(response.status, 200);
        const data = await response.json();
        assertEquals(data.success, true);
        assertEquals(data.message, 'Form submitted successfully and is pending approval');

        // Verify initial submission status is pending_approval
        const subInsert = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/form_submissions' && call.method === 'POST',
        );
        assertEquals((subInsert?.body as Record<string, unknown>)?.status, 'pending_approval');

        // Verify approval_requests insertion
        const approvalInsert = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/approval_requests' && call.method === 'POST',
        );
        assertEquals(Boolean(approvalInsert), true);
        assertEquals(
          (approvalInsert?.body as Record<string, unknown>)?.assigned_to_email,
          'leader@example.com',
        );
        assertEquals(
          (approvalInsert?.body as Record<string, unknown>)?.requester_name,
          'John Smith',
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'submit-form-submission creates approval request when form contains required_approval field',
  async () => {
    await withEnv(async () => {
      const approvalFieldId = '44444444-4444-4444-4444-444444444444';
      const fetchMock = mockFetch({
        form: {
          id: FORM_ID,
          title: 'Permit Application',
          duplicate_policy: 'allow_multiple',
          audience: 'public',
          status: 'published',
          metadata: {},
        },
        fields: [
          FIELD,
          {
            id: approvalFieldId,
            field_key: 'field_approval',
            label: 'Approval Requirement',
            field_type: 'required_approval',
            field_applicability: 'all',
            is_required: false,
            options: [],
            validation_rules: {
              approver_email: 'reviewer@example.com',
            },
          },
        ],
      });
      try {
        const response = await handleSubmitFormSubmission(
          request({
            ...payload({ note: 'Permit please', field_approval: 'pending_approval' }),
            public_registrant_info: {
              first_name: 'Jane',
              last_name: 'Doe',
              email: 'jane@example.com',
            },
          }),
        );
        assertEquals(response.status, 200);
        const data = await response.json();
        assertEquals(data.success, true);
        assertEquals(data.status, 'pending_approval');
        assertEquals(data.message, 'Form submitted successfully and is pending approval');

        // Verify initial submission status is pending_approval
        const subInsert = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/form_submissions' && call.method === 'POST',
        );
        assertEquals((subInsert?.body as Record<string, unknown>)?.status, 'pending_approval');

        // Verify approval_requests insertion with field-configured approver
        const approvalInsert = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/approval_requests' && call.method === 'POST',
        );
        assertEquals(Boolean(approvalInsert), true);
        assertEquals(
          (approvalInsert?.body as Record<string, unknown>)?.assigned_to_email,
          'reviewer@example.com',
        );
        assertEquals((approvalInsert?.body as Record<string, unknown>)?.requester_name, 'Jane Doe');
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'submit-form-submission deduplicates approval requests when multiple fields have identical approver',
  async () => {
    await withEnv(async () => {
      const approvalField1 = '44444444-4444-4444-4444-444444444444';
      const approvalField2 = '55555555-5555-5555-5555-555555555555';
      const fetchMock = mockFetch({
        form: {
          id: FORM_ID,
          title: 'Multi-Approval Form',
          duplicate_policy: 'allow_multiple',
          audience: 'public',
          status: 'published',
          metadata: {},
        },
        fields: [
          FIELD,
          {
            id: approvalField1,
            field_key: 'field_approval_1',
            label: 'Approval 1',
            field_type: 'required_approval',
            field_applicability: 'all',
            is_required: false,
            options: [],
            validation_rules: { approver_email: 'sam@example.com' },
          },
          {
            id: approvalField2,
            field_key: 'field_approval_2',
            label: 'Approval 2',
            field_type: 'required_approval',
            field_applicability: 'all',
            is_required: false,
            options: [],
            validation_rules: { approver_email: 'sam@example.com' },
          },
        ],
      });
      try {
        const response = await handleSubmitFormSubmission(
          request({
            ...payload({ note: 'Multi test' }),
            public_registrant_info: { email: 'applicant@example.com' },
          }),
        );
        assertEquals(response.status, 200);
        const data = await response.json();
        assertEquals(data.success, true);
        assertEquals(data.status, 'pending_approval');

        // Verify only 1 approval request is created despite 2 fields having same approver
        const approvalInserts = fetchMock.calls.filter(
          (call) => call.path === '/rest/v1/approval_requests' && call.method === 'POST',
        );
        assertEquals(approvalInserts.length, 1);
        assertEquals(
          (approvalInserts[0]?.body as Record<string, unknown>)?.assigned_to_email,
          'sam@example.com',
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'submit-form-submission creates distinct approval requests for each unique approver',
  async () => {
    await withEnv(async () => {
      const approvalField1 = '44444444-4444-4444-4444-444444444444';
      const approvalField2 = '55555555-5555-5555-5555-555555555555';
      const fetchMock = mockFetch({
        form: {
          id: FORM_ID,
          title: 'Two-Tier Approval Form',
          duplicate_policy: 'allow_multiple',
          audience: 'public',
          status: 'published',
          metadata: {},
        },
        fields: [
          FIELD,
          {
            id: approvalField1,
            field_key: 'field_approval_dept',
            label: 'Department Approval',
            field_type: 'required_approval',
            field_applicability: 'all',
            is_required: false,
            options: [],
            validation_rules: { approver_email: 'dept@example.com' },
          },
          {
            id: approvalField2,
            field_key: 'field_approval_finance',
            label: 'Finance Approval',
            field_type: 'required_approval',
            field_applicability: 'all',
            is_required: false,
            options: [],
            validation_rules: { approver_email: 'finance@example.com' },
          },
        ],
      });
      try {
        const response = await handleSubmitFormSubmission(
          request({
            ...payload({ note: 'Two tier test' }),
            public_registrant_info: { email: 'applicant@example.com' },
          }),
        );
        assertEquals(response.status, 200);
        const data = await response.json();
        assertEquals(data.success, true);
        assertEquals(data.status, 'pending_approval');

        // Verify 2 approval requests are created (one for dept, one for finance)
        const approvalInserts = fetchMock.calls.filter(
          (call) => call.path === '/rest/v1/approval_requests' && call.method === 'POST',
        );
        assertEquals(approvalInserts.length, 2);
        const emails = approvalInserts.map(
          (c) => (c.body as Record<string, unknown>)?.assigned_to_email,
        );
        assertEquals(emails.includes('dept@example.com'), true);
        assertEquals(emails.includes('finance@example.com'), true);
      } finally {
        fetchMock.restore();
      }
    });
  },
);

Deno.test(
  'submit-form-submission updates existing submission with required approval and cancels old requests',
  async () => {
    await withEnv(async () => {
      const fetchMock = mockFetch({
        form: {
          id: FORM_ID,
          duplicate_policy: 'allow_update',
          audience: 'members',
          status: 'published',
        },
        existing: { id: SUBMISSION_ID },
        fields: [
          FIELD,
          {
            id: 'approval-field-id',
            field_key: 'manager_approval',
            label: 'Manager Approval',
            field_type: 'required_approval',
            field_applicability: 'all',
            is_required: false,
            options: [],
            validation_rules: { approver_email: 'manager@example.com' },
          },
        ],
      });
      try {
        const response = await handleSubmitFormSubmission(
          request({
            ...payload({ note: 'Updated answers' }),
            member_id: 'MEM-001',
          }),
        );
        assertEquals(response.status, 200);
        const data = await response.json();
        assertEquals(data.success, true);
        assertEquals(data.status, 'pending_approval');
        assertEquals(data.is_new, false);

        // Verify old approval requests were cancelled
        const patchApprovalCall = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/approval_requests' && call.method === 'PATCH',
        );
        assertEquals(Boolean(patchApprovalCall), true);
        assertEquals((patchApprovalCall?.body as Record<string, unknown>)?.status, 'cancelled');

        // Verify fresh approval request was created
        const postApprovalCall = fetchMock.calls.find(
          (call) => call.path === '/rest/v1/approval_requests' && call.method === 'POST',
        );
        assertEquals(Boolean(postApprovalCall), true);
        assertEquals(
          (postApprovalCall?.body as Record<string, unknown>)?.assigned_to_email,
          'manager@example.com',
        );
      } finally {
        fetchMock.restore();
      }
    });
  },
);
