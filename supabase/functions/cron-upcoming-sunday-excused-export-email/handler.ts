import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { sendResendEmail } from '@/shared/resend.ts';
import { z } from '@/shared/validation.ts';

const CRON_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila (UTC+8)
const DAY_MS = 24 * 60 * 60 * 1000;

type SundayRequestRecord = {
  firstName: string;
  lastName: string;
  requestDate: string;
  services: string;
  reason: string;
  email: string;
};

const cronEnvironmentSchema = z.object({
  RESEND_API_KEY: z.string().trim().min(1, 'RESEND_API_KEY is required'),
  UPCOMING_SUNDAY_TARGET_EMAIL: z
    .string()
    .trim()
    .email('UPCOMING_SUNDAY_TARGET_EMAIL must be a valid email address'),
  RESEND_FROM_EMAIL: z
    .string()
    .trim()
    .email('RESEND_FROM_EMAIL must be a valid email address')
    .default('onboarding@resend.dev'),
});

type CronEnvironment = {
  resendApiKey: string;
  targetEmail: string;
  fromEmail: string;
};

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}

function parseCronEnvironment(): CronEnvironment | null {
  const parsed = cronEnvironmentSchema.safeParse({
    RESEND_API_KEY: Deno.env.get('RESEND_API_KEY') ?? '',
    UPCOMING_SUNDAY_TARGET_EMAIL: Deno.env.get('UPCOMING_SUNDAY_TARGET_EMAIL') ?? '',
    RESEND_FROM_EMAIL: Deno.env.get('RESEND_FROM_EMAIL') ?? undefined,
  });

  if (!parsed.success) {
    console.error('[cron-upcoming-sunday-excused-export-email] Invalid cron env', {
      issues: parsed.error.issues,
    });
    return null;
  }

  return {
    resendApiKey: parsed.data.RESEND_API_KEY,
    targetEmail: parsed.data.UPCOMING_SUNDAY_TARGET_EMAIL,
    fromEmail: parsed.data.RESEND_FROM_EMAIL,
  };
}

function normalizeValueToText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(normalizeValueToText).join(', ');
  return String(value);
}

function formatDateInManilaTime(epochMs: number): string {
  const manilaDate = new Date(epochMs + CRON_TIMEZONE_OFFSET_MS);
  const year = manilaDate.getUTCFullYear();
  const month = String(manilaDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(manilaDate.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeUpcomingSundayDate(referenceDateEpochMs = Date.now()): string {
  const manilaDate = new Date(referenceDateEpochMs + CRON_TIMEZONE_OFFSET_MS);
  const dayOfWeek = manilaDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ...
  const daysUntilSunday = (7 - dayOfWeek) % 7;
  const targetEpochMs = referenceDateEpochMs + daysUntilSunday * DAY_MS;
  return formatDateInManilaTime(targetEpochMs);
}

function resolveTargetSundayDate(req: Request): string {
  const queryTargetDate = new URL(req.url).searchParams.get('target_sunday_date');
  if (queryTargetDate && /^\d{4}-\d{2}-\d{2}$/.test(queryTargetDate)) {
    return queryTargetDate;
  }
  return computeUpcomingSundayDate();
}

async function sendEmailWithAttachment(params: {
  resendApiKey: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  html: string;
  filename: string;
  content: string;
}): Promise<{ ok: boolean; status: number; body?: unknown }> {
  const base64Content = btoa(params.content);

  return await sendResendEmail({
    apiKey: params.resendApiKey,
    from: params.fromEmail,
    to: [params.toEmail],
    subject: params.subject,
    html: params.html,
    attachments: [
      {
        filename: params.filename,
        content: base64Content,
      },
    ],
  });
}

type ServiceExcuseWithUserRow = {
  services: string[] | string | null;
  reason: string | null;
  users:
    | {
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }
    | Array<{
        first_name: string | null;
        last_name: string | null;
        email: string | null;
      }>
    | null;
};

export async function handleCronUpcomingSundayExcusedExportEmail(req: Request): Promise<Response> {
  const guard = await useEdgeHook({
    req,
    functionName: 'cron-upcoming-sunday-excused-export-email',
    allowAnyOrigin: true,
    method: 'POST',
    requireAdmin: true,
    allowServiceRole: true,
    allowCronRole: true,
    allowedRoles: ['admin', 'super_admin'],
    publicRateLimit: {
      scope: 'cron-upcoming-sunday-excused-export-email',
      windowMs: RATE_LIMIT_PRESETS.cron.upcomingSundayExcusedExportEmail.windowMs,
      maxHits: RATE_LIMIT_PRESETS.cron.upcomingSundayExcusedExportEmail.maxHits,
    },
  });

  if (!guard.valid) {
    console.error('[cron-upcoming-sunday-excused-export-email] Request rejected by edge hook', {
      requestId: guard.requestId,
      status: guard.response.status,
    });
    return guard.response;
  }

  console.log('[cron-upcoming-sunday-excused-export-email] Edge hook accepted request', {
    requestId: guard.requestId,
    callerType: guard.callerType,
    callerId: guard.userId,
  });

  try {
    const targetSundayDate = resolveTargetSundayDate(req);
    console.log('[cron-upcoming-sunday-excused-export-email] Computed target date', {
      requestId: guard.requestId,
      targetSundayDate,
    });

    const cronEnv = parseCronEnvironment();
    if (!cronEnv) {
      console.error('[cron-upcoming-sunday-excused-export-email] Cron environment is invalid', {
        requestId: guard.requestId,
      });
      return jsonResponse(500, {
        success: false,
        error: 'Cron email environment not configured',
      });
    }

    const { data: excuses, error: excusesError } = await guard.client
      .from('service_excuse_requests')
      .select('services, reason, users!inner(first_name, last_name, email)')
      .eq('request_date', targetSundayDate)
      .eq('status', 'approved');

    if (excusesError) {
      console.error(
        '[cron-upcoming-sunday-excused-export-email] Service excuses lookup failed',
        excusesError,
      );
      return jsonResponse(500, {
        success: false,
        error: 'Failed to query service excuse requests',
      });
    }

    const rows = (excuses as ServiceExcuseWithUserRow[]) ?? [];

    if (rows.length === 0) {
      // No matching requests for this Sunday, send empty report
      const jsonAttachment = JSON.stringify([], null, 2);
      const filename = `sunday-excuse-requests-${targetSundayDate}.json`;

      const emailResult = await sendEmailWithAttachment({
        resendApiKey: cronEnv.resendApiKey,
        fromEmail: cronEnv.fromEmail,
        toEmail: cronEnv.targetEmail,
        subject: `Sunday Excuse Requests (${targetSundayDate} - ${new Date().toLocaleTimeString()})`,
        html: `<p>Attached is the Sunday excuse request export for <strong>${targetSundayDate}</strong>.</p><p>Records: <strong>0</strong></p>`,
        filename,
        content: jsonAttachment,
      });

      console.log('[cron-upcoming-sunday-excused-export-email] Empty export email completed', {
        requestId: guard.requestId,
        ok: emailResult.ok,
        status: emailResult.ok ? 200 : emailResult.status,
      });

      if (!emailResult.ok) {
        console.error('[cron-upcoming-sunday-excused-export-email] Resend send failed', {
          status: emailResult.status,
          body: emailResult.body,
        });

        return jsonResponse(502, {
          success: false,
          error: 'Failed to send email attachment',
          resend_status: emailResult.status,
        });
      }

      return jsonResponse(200, {
        success: true,
        records: 0,
        targetDate: targetSundayDate,
      });
    }

    const payload: SundayRequestRecord[] = [];

    for (const item of rows) {
      const user = Array.isArray(item.users) ? item.users[0] : item.users;
      if (!user) continue;

      payload.push({
        firstName: (user.first_name ?? '').trim(),
        lastName: (user.last_name ?? '').trim(),
        requestDate: targetSundayDate,
        services: normalizeValueToText(item.services),
        reason: (item.reason ?? '').trim(),
        email: (user.email ?? '').trim(),
      });
    }

    const jsonAttachment = JSON.stringify(payload, null, 2);
    const filename = `sunday-excuse-requests-${targetSundayDate}.json`;

    const emailResult = await sendEmailWithAttachment({
      resendApiKey: cronEnv.resendApiKey,
      fromEmail: cronEnv.fromEmail,
      toEmail: cronEnv.targetEmail,
      subject: `Sunday Excuse Requests (${targetSundayDate} - ${new Date().toLocaleTimeString()})`,
      html: `<p>Attached is the Sunday excuse request export for <strong>${targetSundayDate}</strong>.</p><p>Records: <strong>${payload.length}</strong></p>`,
      filename,
      content: jsonAttachment,
    });

    console.log('[cron-upcoming-sunday-excused-export-email] Export email completed', {
      requestId: guard.requestId,
      recordCount: payload.length,
      ok: emailResult.ok,
      status: emailResult.ok ? 200 : emailResult.status,
    });

    if (!emailResult.ok) {
      console.error('[cron-upcoming-sunday-excused-export-email] Resend send failed', {
        status: emailResult.status,
        body: emailResult.body,
      });

      return jsonResponse(502, {
        success: false,
        error: 'Failed to send email attachment',
        resend_status: emailResult.status,
      });
    }

    return jsonResponse(200, {
      success: true,
      target_sunday_date: targetSundayDate,
      recipient: cronEnv.targetEmail,
      row_count: payload.length,
      filename,
    });
  } catch (error) {
    console.error('[cron-upcoming-sunday-excused-export-email] Unexpected error', {
      requestId: guard.requestId,
      error,
    });
    return jsonResponse(500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing the request.',
    });
  }
}
