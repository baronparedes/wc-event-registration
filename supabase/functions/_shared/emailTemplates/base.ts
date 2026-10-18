import { escapeHtml } from '../emailTemplate.ts';

export interface BaseEmailLayoutOptions {
  title?: string;
  heading?: string;
  headingColor?: string;
  bodyHtml: string;
  ctaButton?: {
    label: string;
    url: string;
  };
  footerNotice?: string;
}

/**
 * Standardized responsive email wrapper for Welcome Hub notifications.
 */
export function renderBaseEmailLayout(options: BaseEmailLayoutOptions): string {
  const {
    title,
    heading,
    headingColor = '#1f2937',
    bodyHtml,
    ctaButton,
    footerNotice = 'Sent via welcomehub.app',
  } = options;

  const escapedTitle = title ? escapeHtml(title) : 'Welcome Hub Notification';

  const buttonHtml = ctaButton
    ? `
      <div style="margin-top: 24px; text-align: center;">
        <a href="${escapeHtml(ctaButton.url)}" style="display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);" target="_blank" rel="noopener noreferrer">
          <span style="color: #ffffff !important;">${escapeHtml(ctaButton.label)}</span>
        </a>
      </div>
      <p style="margin-top: 20px; font-size: 13px; color: #64748b; text-align: center; word-break: break-all;">
        Or copy this review link: <br /><a href="${escapeHtml(ctaButton.url)}" style="color: #4f46e5;" target="_blank" rel="noopener noreferrer">${escapeHtml(ctaButton.url)}</a>
      </p>
    `
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; background-color: #f8fafc; margin: 0; padding: 24px;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);">
    ${heading ? `<h2 style="color: ${escapeHtml(headingColor)}; margin-top: 0; font-size: 20px; font-weight: 700; line-height: 1.3;">${escapeHtml(heading)}</h2>` : ''}
    <div style="font-size: 15px; color: #334155;">
      ${bodyHtml}
    </div>
    ${buttonHtml}
    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;" />
    <p style="font-size: 12px; color: #94a3b8; margin: 0; text-align: center;">
      ${escapeHtml(footerNotice)}
    </p>
  </div>
</body>
</html>`;
}
