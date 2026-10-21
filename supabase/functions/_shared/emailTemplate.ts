export interface PowerAutomateBatchItem {
  to: string;
  subject: string;
  body_html: string;
  metadata?: Record<string, unknown>;
}

export interface PowerAutomateBatchPayload {
  batch_id: string;
  batch_type?: 'sunday_reminder' | 'broadcast' | 'approval';
  count: number;
  created_at: string;
  items: PowerAutomateBatchItem[];
}

export interface ResendTemplateDetails {
  id: string;
  name?: string;
  subject?: string;
  html?: string;
  text?: string;
}

const templateCache = new Map<string, ResendTemplateDetails | null>();

/**
 * Resets the in-memory template cache. Useful for test isolation.
 */
export function resetTemplateCache(): void {
  templateCache.clear();
}

/**
 * Encodes a string to base64 safely handling UTF-8 characters across chunk boundaries.
 */
export function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

/**
 * Escapes characters for safe HTML output.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Replaces {{variable}} and {{{variable}}} placeholders, and handles simple {{#key}}...{{/key}}
 * and {{^key}}...{{/key}} conditional blocks with matching values from variables dictionary.
 */
export function tokenizeTemplate(
  templateStr: string,
  variables?: Record<string, unknown> | null,
): string {
  if (!templateStr) return '';
  if (!variables) return templateStr;

  // 1. Process conditional sections: {{#key}}...{{/key}}
  let result = templateStr.replace(
    /\{\{#([a-zA-Z0-9_.-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key, content) => {
      const val = variables[key];
      const isTruthy =
        val !== undefined &&
        val !== null &&
        val !== false &&
        val !== '' &&
        (!Array.isArray(val) || val.length > 0);
      return isTruthy ? content : '';
    },
  );

  // 2. Process inverted sections: {{^key}}...{{/key}}
  result = result.replace(
    /\{\{\^([a-zA-Z0-9_.-]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key, content) => {
      const val = variables[key];
      const isFalsy =
        val === undefined ||
        val === null ||
        val === false ||
        val === '' ||
        (Array.isArray(val) && val.length === 0);
      return isFalsy ? content : '';
    },
  );

  // 3. Process variable replacements: {{key}} and {{{key}}}
  return result.replace(/\{\{\{?\s*([a-zA-Z0-9_.-]+)\s*\}?\}\}/g, (_, key) => {
    const val = variables[key];
    if (val === undefined || val === null) {
      return '';
    }
    return String(val);
  });
}

/**
 * Converts URLs within safely escaped text into clickable hyperlinks.
 */
export function linkifyEscapedText(escapedText: string): string {
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  return escapedText.replace(
    urlPattern,
    '<a href="$1" style="color: #2563eb; text-decoration: underline;" target="_blank" rel="noopener noreferrer">$1</a>',
  );
}

/**
 * Resolves a URL to an absolute URL targeting Welcome Hub if it is a relative path.
 */
export function toAbsoluteUrl(url?: string | null, baseUrl?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';

  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return trimmed;
  }

  const base = (
    baseUrl ||
    Deno.env.get('APP_URL') ||
    Deno.env.get('PUBLIC_APP_URL') ||
    'https://welcomehub.app'
  ).replace(/\/+$/, '');

  const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${path}`;
}

/**
 * Derives a user-friendly Call-To-Action (CTA) button label from a destination URL or path.
 */
export function resolveActionText(url?: string | null): string {
  if (!url) return 'View Details';
  const clean = url.trim().toLowerCase();
  if (clean.includes('/events/') || clean.includes('/event/')) {
    return 'View Event';
  }
  if (clean.includes('/profile')) {
    return 'View Profile';
  }
  if (clean.includes('/register')) {
    return 'Register Now';
  }
  if (clean.includes('/forms/') || clean.includes('/form/')) {
    return 'Open Form';
  }
  if (clean.includes('/admin/')) {
    return 'Open Admin Dashboard';
  }
  if (clean === '/' || clean === 'https://welcomehub.app' || clean === 'https://welcomehub.app/') {
    return 'Open Welcome Hub';
  }
  return 'View Details';
}

export interface WrapPlainTextAsHtmlOptions {
  actionUrl?: string | null;
  actionText?: string | null;
  baseUrl?: string | null;
}

/**
 * Wraps plain text content into a responsive, clean HTML email layout.
 */
export function wrapPlainTextAsHtml(
  text: string,
  title?: string,
  options?: WrapPlainTextAsHtmlOptions,
): string {
  const escapedTitle = title ? escapeHtml(title) : 'Notification';

  let cleanText = (text || '').trim();
  let actionUrl = options?.actionUrl?.trim() || '';

  // If actionUrl wasn't explicitly provided, check if text ends with a trailing URL / relative path
  if (!actionUrl) {
    const trailingUrlMatch = cleanText.match(
      /(?:^|\r?\n\r?\n)(\/[a-zA-Z0-9_\-./?=&%#]+|https?:\/\/[^\s<]+)\s*$/,
    );
    if (trailingUrlMatch && trailingUrlMatch[1]) {
      actionUrl = trailingUrlMatch[1];
      cleanText = cleanText.slice(0, cleanText.length - trailingUrlMatch[0].length).trim();
    }
  } else {
    // If actionUrl was provided, strip any trailing occurrence of it from cleanText
    const escapedActionUrl = actionUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const trailingRegex = new RegExp(`(?:\\r?\\n\\r?\\n)?${escapedActionUrl}\\s*$`, 'i');
    cleanText = cleanText.replace(trailingRegex, '').trim();

    // Also strip if cleanText ends with the absolute version of actionUrl
    const absUrl = toAbsoluteUrl(actionUrl, options?.baseUrl || undefined);
    if (absUrl && absUrl !== actionUrl) {
      const escapedAbs = absUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const trailingAbsRegex = new RegExp(`(?:\\r?\\n\\r?\\n)?${escapedAbs}\\s*$`, 'i');
      cleanText = cleanText.replace(trailingAbsRegex, '').trim();
    }
  }

  const escapedBody = linkifyEscapedText(escapeHtml(cleanText)).replace(/\r?\n/g, '<br />');

  const finalActionUrl = actionUrl ? toAbsoluteUrl(actionUrl, options?.baseUrl || undefined) : '';
  const finalActionText = actionUrl
    ? options?.actionText?.trim() || resolveActionText(actionUrl)
    : '';

  const buttonHtml = finalActionUrl
    ? `
    <div class="email-cta-container" style="margin-top: 28px; margin-bottom: 8px; text-align: center;">
      <a href="${escapeHtml(finalActionUrl)}" class="email-button" style="display: inline-block; background-color: #2563eb; color: #ffffff !important; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; text-align: center; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);" target="_blank" rel="noopener noreferrer">
        <span style="color: #ffffff !important;">${escapeHtml(finalActionText)} &rarr;</span>
      </a>
    </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapedTitle}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #f8fafc;
      margin: 0;
      padding: 24px;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      padding: 32px;
    }
    .email-title {
      margin: 0 0 16px 0;
      color: #0f172a;
      font-size: 20px;
      font-weight: 600;
      line-height: 1.3;
    }
    .email-body {
      font-size: 16px;
      word-break: break-word;
    }
    .email-cta-container {
      margin-top: 28px;
      margin-bottom: 8px;
      text-align: center;
    }
    .email-button {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      text-align: center;
    }
    .email-button:hover {
      background-color: #1d4ed8;
    }
    .email-footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 13px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="email-container">
    ${title ? `<h2 class="email-title">${escapedTitle}</h2>` : ''}
    <div class="email-body">
      ${escapedBody}
    </div>${buttonHtml}
    <div class="email-footer">
      Sent via <a href="https://welcomehub.app" target="_blank" rel="noopener noreferrer">welcomehub.app</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Fetches a template by ID from the Resend API with in-memory caching.
 */
export async function fetchResendTemplate(
  resendTemplateId: string,
  apiKey?: string,
): Promise<ResendTemplateDetails | null> {
  const key = apiKey || Deno.env.get('RESEND_API_KEY');
  if (!key) {
    console.warn('[fetchResendTemplate] Missing RESEND_API_KEY');
    return null;
  }

  if (templateCache.has(resendTemplateId)) {
    return templateCache.get(resendTemplateId) ?? null;
  }

  try {
    const response = await fetch(`https://api.resend.com/templates/${resendTemplateId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'User-Agent': 'WelcomeHub/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn(
        `[fetchResendTemplate] Failed to fetch template ${resendTemplateId}: HTTP ${response.status}`,
        errorText,
      );
      templateCache.set(resendTemplateId, null);
      return null;
    }

    const resJson: unknown = await response.json().catch(() => null);
    if (!resJson || typeof resJson !== 'object') {
      console.warn(
        `[fetchResendTemplate] Unexpected response payload for template ${resendTemplateId}`,
      );
      templateCache.set(resendTemplateId, null);
      return null;
    }

    const data: ResendTemplateDetails =
      'data' in resJson && resJson.data && typeof resJson.data === 'object'
        ? (resJson.data as ResendTemplateDetails)
        : (resJson as ResendTemplateDetails);

    templateCache.set(resendTemplateId, data);
    return data;
  } catch (error) {
    console.warn(
      `[fetchResendTemplate] Network error fetching template ${resendTemplateId}:`,
      error,
    );
    templateCache.set(resendTemplateId, null);
    return null;
  }
}

/**
 * Formats an array of key highlights into an HTML list (<ul><li>...</li></ul>)
 * for passing as a parameter to Resend email templates.
 */
export function formatKeyHighlightsHtml(highlights: string[]): string {
  if (!highlights || highlights.length === 0) return '';
  const items = highlights
    .map((h) => `<li style="margin-bottom: 6px; color: #334155;">${escapeHtml(h)}</li>`)
    .join('');
  return `<ul style="margin: 0; padding-left: 20px; line-height: 1.5;">${items}</ul>`;
}

export interface SundayDebriefEmailTextParams {
  sundayDate: string;
  turnupRate: number;
  peakSlot: string;
  totalCommitted: number;
  totalPresent: number;
  totalWalkIns: number;
  summary: string;
  keyHighlights: string[];
  actionUrl: string;
}

/**
 * Formats plain text version of Sunday Executive Debrief for email fallback.
 */
export function formatSundayDebriefEmailText(params: SundayDebriefEmailTextParams): string {
  const highlightsList = params.keyHighlights.map((h) => `• ${h}`).join('\n');
  return `CCF Welcome Center — Sunday Executive Debrief (${params.sundayDate})
Turn-up Rate: ${params.turnupRate}% | Peak: ${params.peakSlot}
Present: ${params.totalPresent} / ${params.totalCommitted} | Walk-ins: +${params.totalWalkIns}

${params.summary}

Executive Highlights:
${highlightsList}

View the full debrief in the Services Dashboard:
${params.actionUrl}
`;
}
