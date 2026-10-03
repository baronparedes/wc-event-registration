import { isLocalBroadcastEnabled, logLocalBroadcast } from './localBroadcast.ts';

export interface SendResendEmailOptions {
  to: string | string[];
  from?: string;
  subject?: string;
  text?: string;
  html?: string;
  template_id?: string;
  variables?: Record<string, unknown>;
  data?: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
  }>;
  metadata?: Record<string, unknown>;
  targetType?: string;
  apiKey?: string;
}

export type SendResendEmailResult =
  | { ok: true; id?: string; status: number }
  | { ok: false; error: string; status: number };

/**
 * Unified helper for sending emails via Resend.
 * Encapsulates the local broadcast test/dev harness so callers do not need
 * environment-specific branching across the codebase.
 */
export async function sendResendEmail(
  options: SendResendEmailOptions,
): Promise<SendResendEmailResult> {
  const apiKey = options.apiKey || Deno.env.get('RESEND_API_KEY');
  const fromEmail = options.from || Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@welcomechurch.ph';
  const isLocal = isLocalBroadcastEnabled();

  const recipients = Array.isArray(options.to) ? options.to : [options.to];
  const primaryRecipient = recipients.join(', ');

  // 1. If running under local broadcast harness (or API key not provided in non-production)
  if (isLocal || !apiKey) {
    if (!apiKey && !isLocal) {
      console.error('[sendResendEmail] RESEND_API_KEY is not configured and not in local mode');
      return {
        ok: false,
        error: 'Email provider not configured',
        status: 500,
      };
    }

    await logLocalBroadcast({
      type: 'email',
      targetType: options.targetType || 'email-notification',
      recipient: primaryRecipient,
      subject: options.subject,
      body:
        options.text ||
        options.html ||
        (options.template_id ? `[Template: ${options.template_id}]` : ''),
      metadata: options.metadata || options.variables || options.data,
    });

    return {
      ok: true,
      id: `local-sim-${Date.now()}`,
      status: 200,
    };
  }

  // 2. Production / Live Resend delivery
  try {
    const payload: Record<string, unknown> = {
      from: fromEmail,
      to: options.to,
    };

    if (options.subject) payload.subject = options.subject;
    if (options.text) payload.text = options.text;
    if (options.html) payload.html = options.html;
    if (options.template_id) payload.template_id = options.template_id;
    if (options.variables) payload.variables = options.variables;
    if (options.data) payload.data = options.data;
    if (options.attachments && options.attachments.length > 0) {
      payload.attachments = options.attachments;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sendResendEmail] Resend API error:', {
        status: response.status,
        error: errorText,
      });
      return {
        ok: false,
        error: errorText,
        status: response.status,
      };
    }

    const resJson = await response.json().catch(() => ({}));
    return {
      ok: true,
      id: (resJson as { id?: string }).id,
      status: response.status,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sendResendEmail] Unexpected error dispatching via Resend:', message);
    return {
      ok: false,
      error: message,
      status: 500,
    };
  }
}
