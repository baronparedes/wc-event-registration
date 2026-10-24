import { assertEquals } from '@std/assert';

import {
  buildApprovalReviewUrl,
  createApprovalRequest,
  enqueueApprovalOutcomeEmail,
  enqueueApprovalReviewEmail,
} from '../approvals.ts';

const APPROVAL_ID = '33333333-3333-4333-8333-333333333333';
const ACCESS_TOKEN = 'test-approval-access-token';

Deno.test('buildApprovalReviewUrl formats clean review link without trailing slashes', () => {
  const originalUrl = Deno.env.get('PUBLIC_APP_URL');
  try {
    Deno.env.set('PUBLIC_APP_URL', 'https://example.com///');
    const url = buildApprovalReviewUrl('sample-token');
    assertEquals(url, 'https://example.com/approvals/review/sample-token');
  } finally {
    if (originalUrl === undefined) Deno.env.delete('PUBLIC_APP_URL');
    else Deno.env.set('PUBLIC_APP_URL', originalUrl);
  }
});

Deno.test('createApprovalRequest inserts approval record with metadata', async () => {
  let insertPayload: Record<string, unknown> | null = null;
  const mockSupabase = {
    from: () => ({
      insert: (payload: Record<string, unknown>) => {
        insertPayload = payload;
        return {
          select: () => ({
            single: () =>
              Promise.resolve({
                data: { id: APPROVAL_ID, access_token: ACCESS_TOKEN },
                error: null,
              }),
          }),
        };
      },
    }),
  } as never;

  const result = await createApprovalRequest(mockSupabase, {
    entityType: 'service_excuse',
    entityId: 'excuse-123',
    title: 'Long Leave',
    summary: 'Leave summary',
    requesterName: 'Test Volunteer',
    assignedToEmail: 'approver@example.com',
    metadata: { test: true },
  });

  assertEquals(result.success, true);
  assertEquals(result.approval?.id, APPROVAL_ID);
  assertEquals(result.approval?.access_token, ACCESS_TOKEN);
  const payload = insertPayload as Record<string, unknown> | null;
  assertEquals(payload?.entity_type, 'service_excuse');
  assertEquals(payload?.entity_id, 'excuse-123');
  assertEquals(payload?.assigned_to_email, 'approver@example.com');
});

Deno.test('enqueueApprovalReviewEmail enqueues notification and triggers worker', async () => {
  const rpcCalls: Array<{ name: string; args?: unknown }> = [];
  const mockSupabase = {
    rpc: (name: string, args?: unknown) => {
      rpcCalls.push({ name, args });
      if (name === 'enqueue_email_notification') {
        return Promise.resolve({ data: 101, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  } as never;

  const result = await enqueueApprovalReviewEmail(mockSupabase, {
    assignedToEmail: 'approver@example.com',
    subjectTitle: 'Test Leave - Test Member',
    heading: 'Approval Required',
    description: 'Please review this request:',
    details: [{ label: 'Member', value: 'Test Member' }],
    accessToken: ACCESS_TOKEN,
    approvalId: APPROVAL_ID,
  });

  assertEquals(result.success, true);
  assertEquals(result.messageId, 101);

  const enqueueCall = rpcCalls.find((c) => c.name === 'enqueue_email_notification');
  assertEquals(Boolean(enqueueCall), true);
  const queuePayload = (enqueueCall?.args as { payload: Record<string, unknown> })?.payload;
  assertEquals(queuePayload?.recipient, 'approver@example.com');
  assertEquals(queuePayload?.category, 'approval');
  assertEquals(queuePayload?.event_type, 'email_notification');
  assertEquals(queuePayload?.template_slug, 'approval-review-request');
  assertEquals(queuePayload?.subject, '[Approval Required] Test Leave - Test Member');
  assertEquals(typeof queuePayload?.html, 'string');
  assertEquals((queuePayload?.html as string).includes('Test Member'), true);

  const triggerCall = rpcCalls.find((c) => c.name === 'trigger_email_processor');
  assertEquals(Boolean(triggerCall), true);
});

Deno.test('enqueueApprovalOutcomeEmail enqueues decision notification to requester', async () => {
  const rpcCalls: Array<{ name: string; args?: unknown }> = [];
  const mockSupabase = {
    rpc: (name: string, args?: unknown) => {
      rpcCalls.push({ name, args });
      if (name === 'enqueue_email_notification') {
        return Promise.resolve({ data: 102, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
  } as never;

  const result = await enqueueApprovalOutcomeEmail(mockSupabase, {
    recipientEmail: 'requester@example.com',
    requesterName: 'Test Requester',
    title: 'Medical Leave',
    decision: 'approved',
    notes: 'Rest well',
    approvalId: APPROVAL_ID,
  });

  assertEquals(result.success, true);
  assertEquals(result.messageId, 102);

  const enqueueCall = rpcCalls.find((c) => c.name === 'enqueue_email_notification');
  assertEquals(Boolean(enqueueCall), true);
  const queuePayload = (enqueueCall?.args as { payload: Record<string, unknown> })?.payload;
  assertEquals(queuePayload?.recipient, 'requester@example.com');
  assertEquals(queuePayload?.category, 'approval');
  assertEquals(queuePayload?.event_type, 'email_notification');
  assertEquals(queuePayload?.template_slug, 'approval-outcome-notification');
  assertEquals(queuePayload?.subject, 'Your request for "Medical Leave" has been Approved');
  assertEquals(typeof queuePayload?.html, 'string');
  assertEquals((queuePayload?.html as string).includes('Rest well'), true);
  assertEquals((queuePayload?.html as string).includes('approved'), true);
});
