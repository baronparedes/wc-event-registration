import { assertEquals } from '@std/assert';

import {
  buildApprovalOutcomeEmail,
  buildApprovalReviewEmail,
  renderBaseEmailLayout,
} from '../index.ts';

Deno.test('renderBaseEmailLayout renders title, body, and CTA button', () => {
  const html = renderBaseEmailLayout({
    title: 'Test Notification',
    heading: 'Attention Required',
    bodyHtml: '<p>Important content here</p>',
    ctaButton: {
      label: 'View Action',
      url: 'https://welcomehub.app/test',
    },
    footerNotice: 'Test Footer',
  });

  assertEquals(html.includes('Test Notification'), true);
  assertEquals(html.includes('Attention Required'), true);
  assertEquals(html.includes('Important content here'), true);
  assertEquals(html.includes('View Action'), true);
  const ctaHrefMatch = html.match(/href="([^"]+)"/);
  assertEquals(ctaHrefMatch?.[1], 'https://welcomehub.app/test');
  assertEquals(html.includes('Test Footer'), true);
});

Deno.test('buildApprovalReviewEmail formats subject, details, and review link', () => {
  const result = buildApprovalReviewEmail({
    subjectTitle: 'Volunteer Leave - Test Person',
    heading: 'Volunteer Approval Required',
    description: 'Please review the following details:',
    details: [
      { label: 'Volunteer', value: 'Test Person' },
      { label: 'Dates', value: '2026-11-01 to 2026-11-29' },
    ],
    reviewUrl: 'https://welcomehub.app/approvals/review/test-token-123',
  });

  assertEquals(result.subject, '[Approval Required] Volunteer Leave - Test Person');
  assertEquals(result.html.includes('Volunteer Approval Required'), true);
  assertEquals(result.html.includes('Test Person'), true);
  assertEquals(result.html.includes('2026-11-01 to 2026-11-29'), true);
  const reviewHrefMatch = result.html.match(/href="([^"]+)"/);
  assertEquals(reviewHrefMatch?.[1], 'https://welcomehub.app/approvals/review/test-token-123');
  assertEquals(result.text.includes('Volunteer: Test Person'), true);
  const reviewUrlInText = result.text.match(/https:\/\/[^\s]+/)?.[0];
  assertEquals(reviewUrlInText, 'https://welcomehub.app/approvals/review/test-token-123');
});

Deno.test('buildApprovalOutcomeEmail formats approved decision with green theme', () => {
  const result = buildApprovalOutcomeEmail({
    title: 'Long Leave',
    requesterName: 'Test Volunteer',
    decision: 'approved',
    notes: 'Approved by team lead',
  });

  assertEquals(result.subject, 'Your request for "Long Leave" has been Approved');
  assertEquals(result.html.includes('Request Approved'), true);
  assertEquals(result.html.includes('Hello Test Volunteer,'), true);
  assertEquals(result.html.includes('approved'), true);
  assertEquals(result.html.includes('Approved by team lead'), true);
  assertEquals(result.html.includes('#059669'), true);
  assertEquals(result.text.includes('approved'), true);
  assertEquals(result.text.includes('Approved by team lead'), true);
});

Deno.test('buildApprovalOutcomeEmail formats rejected decision with red theme', () => {
  const result = buildApprovalOutcomeEmail({
    title: 'Form Submission',
    requesterName: 'Test Requester',
    decision: 'rejected',
    notes: 'Incomplete information',
  });

  assertEquals(result.subject, 'Your request for "Form Submission" has been Declined');
  assertEquals(result.html.includes('Request Declined'), true);
  assertEquals(result.html.includes('Hello Test Requester,'), true);
  assertEquals(result.html.includes('declined'), true);
  assertEquals(result.html.includes('Incomplete information'), true);
  assertEquals(result.html.includes('#e11d48'), true);
  assertEquals(result.text.includes('declined'), true);
  assertEquals(result.text.includes('Incomplete information'), true);
});
