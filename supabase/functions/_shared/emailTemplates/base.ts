import { escapeHtml } from '../emailTemplate.ts';

export interface BaseEmailLayoutOptions {
  title?: string;
  preheader?: string;
  heading?: string;
  headingColor?: string;
  subtitle?: string;
  bodyHtml: string;
  ctaButton?: {
    label: string;
    url: string;
  };
  footerNotice?: string;
}

/**
 * Standardized responsive email wrapper for Welcome Hub notifications,
 * matching the official Welcome Hub Resend design system.
 */
export function renderBaseEmailLayout(options: BaseEmailLayoutOptions): string {
  const {
    title,
    preheader,
    heading,
    headingColor = '#0f172a',
    subtitle,
    bodyHtml,
    ctaButton,
    footerNotice = "You're receiving this message from the Welcome Center team.",
  } = options;

  const escapedTitle = title ? escapeHtml(title) : 'Welcome Hub Notification';
  const previewText = preheader ? escapeHtml(preheader) : escapedTitle;

  const buttonHtml = ctaButton
    ? `
      <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;box-sizing:border-box">
        <tbody>
          <tr style="margin:0;padding:0">
            <td align="center" data-id="__react-email-column" style="margin:0;padding:16px 24px 8px 24px;text-align:center">
              <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0">
                <tbody>
                  <tr style="margin:0;padding:0">
                    <td align="center" data-id="__react-email-column" style="margin:0;padding:0">
                      <p style="margin:0;padding:0">
                        <a href="${escapeHtml(ctaButton.url)}" rel="noopener noreferrer nofollow" style="color:#ffffff;text-decoration-line:none;text-decoration:none;line-height:100%;display:inline-block;max-width:100%;box-sizing:border-box;padding:12px 24px;background-color:#1ca0b3;border-radius:6px;font-weight:600;font-size:0.9em;text-align:center" target="_blank">
                          <span><span style="max-width:100%;display:inline-block;line-height:120%;">${escapeHtml(ctaButton.label)}</span></span>
                        </a>
                        <a href="${escapeHtml(ctaButton.url)}" rel="noopener noreferrer nofollow" style="color:#ffffff;text-decoration-line:none;text-decoration:none;line-height:100%;display:inline-block;max-width:100%;box-sizing:border-box;padding:12px 24px;background-color:#1ca0b3;border-radius:6px;font-weight:600;font-size:0.9em;text-align:center" target="_blank">
                          <span><span style="max-width:100%;display:inline-block;line-height:120%;"> →</span></span>
                        </a>
                      </p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
    `
    : '';

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="en">
<head>
  <meta content="width=device-width" name="viewport"/>
  <meta content="text/html; charset=UTF-8" http-equiv="Content-Type"/>
  <meta name="x-apple-disable-message-reformatting"/>
  <meta content="IE=edge" http-equiv="X-UA-Compatible"/>
  <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection"/>
  <title>${escapedTitle}</title>
  <style>
    @media (prefers-color-scheme: dark) {
      li::marker { color: #c4c4c4; }
    }
    @media only screen and (max-width: 600px) {
      .stat-cell {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
        margin-bottom: 8px !important;
      }
    }
  </style>
</head>
<body dir="ltr" lang="en" style="margin:0;padding-top:0;padding-bottom:0;padding-right:0;padding-left:0">
  <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0" data-skip-in-text="true">
    ${previewText}
    <div>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>
  </div>
  <table border="0" width="100%" cellPadding="0" cellSpacing="0" role="presentation" align="center">
    <tbody>
      <tr>
        <td dir="ltr" lang="en" style="margin:0px;padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px">
          <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:600px;align:center;width:100%;border-radius:0px">
            <tbody>
              <tr style="width:100%">
                <td style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px">
                  <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0">
                    <tbody>
                      <tr style="margin:0;padding:0">
                        <td data-id="__react-email-column" style="margin:0;padding:0;font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;font-size:1em;min-height:100%;line-height:155%">
                          <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="max-width:600px;align:center;width:100%;border-radius:0px;margin:0 auto;line-height:155%">
                            <tbody>
                              <tr style="width:100%">
                                <td style="padding-top:0px;padding-right:0px;padding-bottom:0px;padding-left:0px;padding:0">
                                  <!-- Header with Logo -->
                                  <table width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;box-sizing:border-box">
                                    <tbody>
                                      <tr style="margin:0;padding:0">
                                        <td align="center" data-id="__react-email-column" style="margin:0;padding:32px 24px 12px 24px;text-align:center">
                                          <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" style="margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0">
                                            <tbody>
                                              <tr style="margin:0;padding:0">
                                                <td align="center" data-id="__react-email-column" style="margin:0;padding:0">
                                                  <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation">
                                                    <tbody style="width:100%">
                                                      <tr style="width:100%">
                                                        <td align="center" data-id="__react-email-column">
                                                          <img class="node-image" alt="Welcome Hub Logo" height="90" src="https://resend-attachments.s3.amazonaws.com/32hX96_Sh9RO4nF7jCEiqO/d5d322df-66da-4327-a706-d6d744200fc8" style="display:block;outline:none;border:none;text-decoration:none;border-radius:8px" width="90"/>
                                                        </td>
                                                      </tr>
                                                    </tbody>
                                                  </table>
                                                </td>
                                              </tr>
                                            </tbody>
                                          </table>
                                          ${heading ? `<h1 style="margin:0;padding:12px 0 4px 0;font-size:1.75em;line-height:1.3em;font-weight:700;color:${escapeHtml(headingColor)};text-align:center">${escapeHtml(heading)}</h1>` : ''}
                                          ${subtitle ? `<p style="margin:0;padding:0;font-size:0.95em;color:#64748b;text-align:center;font-weight:500">${escapeHtml(subtitle)}</p>` : ''}
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>

                                  <!-- Content Body Cards -->
                                  ${bodyHtml}

                                  <!-- Call to Action Button -->
                                  ${buttonHtml}

                                  <!-- Footer -->
                                  <table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation" class="node-footer" style="margin-top:0;margin-right:auto;margin-bottom:0;margin-left:auto;padding-top:0;padding-right:0;padding-bottom:0;padding-left:0;font-size:0.8em">
                                    <tbody>
                                      <tr style="margin:0;padding:0">
                                        <td data-id="__react-email-column" style="margin:0;padding:24px 24px 32px 24px">
                                          <hr class="divider" style="width:100%;border:none;border-color:transparent;border-top:1px solid #eaeaea;padding-bottom:1em;border-style:solid;border-width:0;border-top-width:2px"/>
                                          <p style="margin:0;padding:0;font-size:14px;padding-top:0.5em;padding-bottom:0.5em;color:#6b7280;text-align:center">
                                            ${escapeHtml(footerNotice)}<br/>
                                            © 2026 <a href="https://welcomehub.app" rel="noopener noreferrer nofollow" style="color:#0670DB;text-decoration-line:none;text-decoration:underline" target="_blank"><u>welcomehub.app</u></a>
                                          </p>
                                        </td>
                                      </tr>
                                    </tbody>
                                  </table>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
}
