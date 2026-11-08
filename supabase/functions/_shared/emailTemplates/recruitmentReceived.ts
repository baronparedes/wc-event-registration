import { escapeHtml } from '../emailTemplate.ts';
import type { EmailTemplateOutput } from './approvalReview.ts';
import { renderBaseEmailLayout } from './base.ts';

export interface RecruitmentReceivedTemplateParams {
  firstName: string;
  fullName: string;
  desiredRole: string;
  trackingUrl: string;
}

/**
 * Builds email subject, HTML, and text versions notifying an applicant that their
 * volunteer application has been received and provides their personalized magic tracking link.
 */
export function buildRecruitmentReceivedEmail(
  params: RecruitmentReceivedTemplateParams,
): EmailTemplateOutput {
  const { firstName, fullName, desiredRole, trackingUrl } = params;

  const subject = 'Welcome Center Volunteer Application Received';

  const bodyHtml = `
    <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;padding-top:0;padding-right:24px;padding-bottom:0;padding-left:24px;box-sizing:border-box">
      <tbody>
        <tr style="margin:0;padding:0">
          <td data-id="__react-email-column" style="margin:0;padding:16px 20px;background-color:#f4f4f5;border-radius:6px">
            <div style="margin:0;padding:0;font-size:0.85em;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:8px">
              <p style="margin:0;padding:0">Application Received</p>
            </div>
            <p style="margin:0;padding:0;font-size:0.95em;line-height:160%;color:#18181b">
              Hi <strong>${escapeHtml(firstName)}</strong>,<br /><br />
              Thank you for taking the step to serve in the Welcome Center ministry! We have received your application and survey submission.
            </p>
          </td>
        </tr>
      </tbody>
    </table>
    <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;padding-top:0;padding-right:24px;padding-bottom:0;padding-left:24px;box-sizing:border-box">
      <tbody>
        <tr style="margin:0;padding:0">
          <td data-id="__react-email-column" style="margin:0;padding:16px 20px;background-color:#f4f4f5;border-radius:6px">
            <div style="margin:0;padding:0;font-size:0.85em;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:8px">
              <p style="margin:0;padding:0">Application Details</p>
            </div>
            <div style="margin:0;padding:0;line-height:160%;">
              <div style="margin: 0 0 8px 0; font-size: 0.95em;">
                <span style="color: #71717a; font-weight: 600;">Applicant:</span>
                <strong style="color: #0f172a; margin-left: 6px;">${escapeHtml(fullName)}</strong>
              </div>
              <div style="margin: 0 0 8px 0; font-size: 0.95em;">
                <span style="color: #71717a; font-weight: 600;">Desired Role:</span>
                <strong style="color: #0f172a; margin-left: 6px;">${escapeHtml(desiredRole)}</strong>
              </div>
              <div style="margin: 0; font-size: 0.95em;">
                <span style="color: #71717a; font-weight: 600;">Next Step:</span>
                <strong style="color: #0f172a; margin-left: 6px;">DGroup Leader Endorsement &amp; Interview</strong>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
    <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:0;margin-bottom:12px;margin-left:0;padding-top:0;padding-right:24px;padding-bottom:0;padding-left:24px;box-sizing:border-box">
      <tbody>
        <tr style="margin:0;padding:0">
          <td data-id="__react-email-column" style="margin:0;padding:16px 20px;background-color:#eff6ff;border-radius:6px;border-left:4px solid #1ca0b3">
            <div style="margin:0;padding:0;font-size:0.85em;color:#1e40af;text-transform:uppercase;letter-spacing:0.05em;font-weight:700;margin-bottom:6px">
              <p style="margin:0;padding:0">Your Personal Tracking Link</p>
            </div>
            <p style="margin:0;padding:0;font-size:0.9em;line-height:150%;color:#1e3a8a">
              You can track your real-time recruitment progress, schedule updates, and required tasks anytime without needing to log in. Click the button below to view your portal:
            </p>
          </td>
        </tr>
      </tbody>
    </table>
  `;

  const html = renderBaseEmailLayout({
    title: subject,
    preheader: `Thank you for applying to the Welcome Center, ${firstName}! Track your progress anytime.`,
    heading: 'Application Received',
    subtitle: `${desiredRole} Ministry Application`,
    headingColor: '#0f172a',
    bodyHtml,
    ctaButton: {
      label: 'Track My Application',
      url: trackingUrl,
    },
    footerNotice: "You're receiving this message from the Welcome Center team.",
  });

  const text = `Application Received\n\nHi ${firstName},\n\nThank you for applying to serve in the Welcome Center ministry!\n\nApplicant: ${fullName}\nDesired Role: ${desiredRole}\nNext Step: DGroup Leader Endorsement & Interview\n\nYou can track your application progress anytime using this personalized link:\n${trackingUrl}\n\nBlessings,\nWelcome Center Team`;

  return { subject, html, text };
}
