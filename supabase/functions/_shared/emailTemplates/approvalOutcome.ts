import { escapeHtml } from '../emailTemplate.ts';
import type { EmailTemplateOutput } from './approvalReview.ts';
import { renderBaseEmailLayout } from './base.ts';

export interface ApprovalOutcomeTemplateParams {
  title: string;
  requesterName: string;
  decision: 'approved' | 'rejected';
  notes?: string | null;
}

/**
 * Builds email subject, HTML, and text versions notifying a requester of an approval decision.
 */
export function buildApprovalOutcomeEmail(
  params: ApprovalOutcomeTemplateParams,
): EmailTemplateOutput {
  const { title, requesterName, decision, notes } = params;
  const isApproved = decision === 'approved';
  const statusLabel = isApproved ? 'Approved' : 'Declined';
  const statusLower = isApproved ? 'approved' : 'declined';
  const themeColor = isApproved ? '#059669' : '#e11d48';

  const subject = `Your request for "${title}" has been ${statusLabel}`;

  const noteBlock = notes
    ? `
      <div style="margin-top: 20px; padding: 14px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid ${themeColor};">
        <strong style="color: #334155; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Reviewer Note:</strong>
        <p style="margin: 6px 0 0 0; color: #475569; font-size: 14px;">${escapeHtml(notes)}</p>
      </div>
    `
    : '';

  const bodyHtml = `
    <p style="font-size: 15px; color: #1e293b; margin-top: 0;">Hello ${escapeHtml(requesterName)},</p>
    <p style="font-size: 15px; color: #334155;">
      Your request for <strong>${escapeHtml(title)}</strong> has been
      <strong style="color: ${themeColor};">${statusLower}</strong>.
    </p>
    ${noteBlock}
  `;

  const html = renderBaseEmailLayout({
    title: subject,
    heading: `Request ${statusLabel}`,
    headingColor: themeColor,
    bodyHtml,
    footerNotice: 'Automated notification from the Welcome Hub approval system',
  });

  const text = `Hello ${requesterName},\n\nYour request for "${title}" has been ${statusLower}.\n${notes ? `\nReviewer Note: ${notes}\n` : ''}\n---\nWelcome Hub Approvals`;

  return { subject, html, text };
}
