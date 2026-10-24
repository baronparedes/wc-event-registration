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
      <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;padding-top:0;padding-right:24px;padding-bottom:0;padding-left:24px;box-sizing:border-box">
        <tbody>
          <tr style="margin:0;padding:0">
            <td data-id="__react-email-column" style="margin:0;padding:16px 20px;background-color:#f4f4f5;border-radius:6px;border-left:4px solid ${themeColor}">
              <div style="margin:0;padding:0;font-size:0.85em;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:8px">
                <p style="margin:0;padding:0">Reviewer Note</p>
              </div>
              <p style="margin:0;padding:0;font-size:0.95em;line-height:160%;color:#18181b">${escapeHtml(notes)}</p>
            </td>
          </tr>
        </tbody>
      </table>
    `
    : '';

  const bodyHtml = `
    <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;padding-top:0;padding-right:24px;padding-bottom:0;padding-left:24px;box-sizing:border-box">
      <tbody>
        <tr style="margin:0;padding:0">
          <td data-id="__react-email-column" style="margin:0;padding:16px 20px;background-color:#f4f4f5;border-radius:6px">
            <div style="margin:0;padding:0;font-size:0.85em;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:8px">
              <p style="margin:0;padding:0">Decision Status</p>
            </div>
            <p style="margin:0;padding:0;font-size:0.95em;line-height:160%;color:#18181b">
              Hello ${escapeHtml(requesterName)},<br /><br />
              Your request for <strong>${escapeHtml(title)}</strong> has been
              <strong style="color: ${themeColor}; font-weight: 700;">${statusLower}</strong>.
            </p>
          </td>
        </tr>
      </tbody>
    </table>
    ${noteBlock}
  `;

  const html = renderBaseEmailLayout({
    title: subject,
    preheader: `Your request for ${title} has been ${statusLabel}`,
    heading: `Request ${statusLabel}`,
    subtitle: title,
    headingColor: themeColor,
    bodyHtml,
    ctaButton: {
      label: 'View in Welcome Hub',
      url: 'https://welcomehub.app/profile',
    },
    footerNotice: "You're receiving this message from the Welcome Center team.",
  });

  const text = `Hello ${requesterName},\n\nYour request for "${title}" has been ${statusLower}.\n${notes ? `\nReviewer Note: ${notes}\n` : ''}\n---\nWelcome Hub Approvals`;

  return { subject, html, text };
}
