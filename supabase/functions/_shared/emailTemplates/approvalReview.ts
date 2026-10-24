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
      <div style="margin: 0 0 8px 0; font-size: 0.95em;">
        <span style="color: #71717a; font-weight: 600;">${escapeHtml(item.label)}:</span>
        <strong style="color: #0f172a; margin-left: 6px;">${escapeHtml(item.value)}</strong>
      </div>
    `,
    )
    .join('');

  const bodyHtml = `
    <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;padding-top:0;padding-right:24px;padding-bottom:0;padding-left:24px;box-sizing:border-box">
      <tbody>
        <tr style="margin:0;padding:0">
          <td data-id="__react-email-column" style="margin:0;padding:16px 20px;background-color:#f4f4f5;border-radius:6px">
            <div style="margin:0;padding:0;font-size:0.85em;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:8px">
              <p style="margin:0;padding:0">Review Notice</p>
            </div>
            <p style="margin:0;padding:0;font-size:0.95em;line-height:160%;color:#18181b">${escapeHtml(description)}</p>
          </td>
        </tr>
      </tbody>
    </table>
    <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;padding-top:0;padding-right:24px;padding-bottom:0;padding-left:24px;box-sizing:border-box">
      <tbody>
        <tr style="margin:0;padding:0">
          <td data-id="__react-email-column" style="margin:0;padding:16px 20px;background-color:#f4f4f5;border-radius:6px">
            <div style="margin:0;padding:0;font-size:0.85em;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:8px">
              <p style="margin:0;padding:0">Request Information</p>
            </div>
            <div style="margin:0;padding:0;line-height:160%;">
              ${detailsHtml}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  `;

  const html = renderBaseEmailLayout({
    title: subject,
    preheader: `Approval required for ${subjectTitle}`,
    heading,
    subtitle: subjectTitle,
    headingColor: '#0f172a',
    bodyHtml,
    ctaButton: {
      label: 'Review & Take Action',
      url: reviewUrl,
    },
    footerNotice: "You're receiving this message from the Welcome Center team.",
  });

  const detailsText = details.map((d) => `${d.label}: ${d.value}`).join('\n');
  const text = `${heading}\n\n${description}\n\n${detailsText}\n\nReview link: ${reviewUrl}\n\n---\nWelcome Hub Approvals`;

  return { subject, html, text };
}
