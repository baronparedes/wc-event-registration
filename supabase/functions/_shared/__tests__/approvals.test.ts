import { assertEquals } from '@std/assert';

import {
  buildApprovalReviewUrl,
  createApprovalRequest,
  sendApprovalReviewEmail,
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

Deno.test('sendApprovalReviewEmail dispatches notification', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = Deno.env.get('RESEND_API_KEY');
  const originalLocal = Deno.env.get('LOCAL_BROADCAST');
  let fetchCall: { url: string; body: unknown } | null = null;

  try {
    Deno.env.set('RESEND_API_KEY', 'test_key');
    Deno.env.set('LOCAL_BROADCAST', 'false');

    globalThis.fetch = (input, init) => {
      fetchCall = {
        url: input.toString(),
        body: init?.body ? JSON.parse(String(init.body)) : null,
      };
      return Promise.resolve(Response.json({ id: 'resend-123' }));
    };

    await sendApprovalReviewEmail({
      assignedToEmail: 'approver@example.com',
      subjectTitle: 'Test Approval',
      heading: 'Approval Required',
      description: 'Please review',
      details: [{ label: 'Member', value: 'Jane' }],
      accessToken: 'token-abc',
    });

    assertEquals(Boolean(fetchCall), true);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) Deno.env.delete('RESEND_API_KEY');
    else Deno.env.set('RESEND_API_KEY', originalKey);
    if (originalLocal === undefined) Deno.env.delete('LOCAL_BROADCAST');
    else Deno.env.set('LOCAL_BROADCAST', originalLocal);
  }
});
