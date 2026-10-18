import { escapeHtml } from '../emailTemplate.ts';
import { renderBaseEmailLayout } from './base.ts';

export interface ApprovalReviewTemplateParams {
  subjectTitle: string;
  heading?: string;
  description?: string;
  details: Array<{ label: string; value: string }>;
  reviewUrl: string;
}

export interface EmailTemplateOutput {
  subject: string;
  html: string;
  text: string;
}

/**
 * Builds email subject, HTML, and text versions for an assigned approver review request.
 */
export function buildApprovalReviewEmail(
  params: ApprovalReviewTemplateParams,
): EmailTemplateOutput {
  const {
    subjectTitle,
    heading = 'Approval Required',
    description = 'A request requires your review and approval:',
    details,
    reviewUrl,
  } = params;

  const subject = `[Approval Required] ${subjectTitle}`;

  const detailsHtml = details
    .map(
      (item) => `
      <p style="margin: 0 0 8px 0; font-size: 14px;">
        <strong style="color: #475569;">${escapeHtml(item.label)}:</strong>
        <span style="color: #0f172a;">${escapeHtml(item.value)}</span>
      </p>
    `,
    )
    .join('');

  const bodyHtml = `
    <p style="font-size: 15px; color: #334155; margin-top: 0;">${escapeHtml(description)}</p>
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      ${detailsHtml}
    </div>
  `;

  const html = renderBaseEmailLayout({
    title: subject,
    heading,
    headingColor: '#1e293b',
    bodyHtml,
    ctaButton: {
      label: 'Review & Take Action',
      url: reviewUrl,
    },
    footerNotice: 'Automated notification from Welcome Hub Approvals',
  });

  const detailsText = details.map((d) => `${d.label}: ${d.value}`).join('\n');
  const text = `${heading}\n\n${description}\n\n${detailsText}\n\nReview link: ${reviewUrl}\n\n---\nWelcome Hub Approvals`;

  return { subject, html, text };
}
