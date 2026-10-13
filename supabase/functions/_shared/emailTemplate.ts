export interface PowerAutomateBatchItem {
  to: string;
  subject: string;
  body_html: string;
  metadata?: Record<string, unknown>;
}

export interface PowerAutomateBatchPayload {
  batch_id: string;
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
 * Replaces {{variable}} and {{{variable}}} placeholders with matching values from variables dictionary.
 */
export function tokenizeTemplate(
  templateStr: string,
  variables?: Record<string, unknown> | null,
): string {
  if (!templateStr) return '';
  if (!variables) return templateStr;

  return templateStr.replace(/\{\{\{?\s*([a-zA-Z0-9_.-]+)\s*\}?\}\}/g, (_, key) => {
    const val = variables[key];
    if (val === undefined || val === null) {
      return '';
    }
    return String(val);
  });
}

/**
 * Wraps plain text content into a responsive, clean HTML email layout.
 */
export function wrapPlainTextAsHtml(text: string, title?: string): string {
  const escapedTitle = title ? escapeHtml(title) : 'Church Notification';
  const escapedBody = escapeHtml(text || '').replace(/\r?\n/g, '<br />');

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
    .email-body {
      font-size: 16px;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-body">
      ${escapedBody}
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
      },
    });

    if (!response.ok) {
      console.warn(
        `[fetchResendTemplate] Failed to fetch template ${resendTemplateId}: HTTP ${response.status}`,
      );
      templateCache.set(resendTemplateId, null);
      return null;
    }

    const data = (await response.json()) as ResendTemplateDetails;
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
