import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { z } from '@/shared/validation.ts';

const CRON_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000; // Asia/Manila (UTC+8)
const DAY_MS = 24 * 60 * 60 * 1000;
const REQUIRED_FIELD_KEYS = ['request_date', 'services', 'reason'] as const;

type FieldKey = (typeof REQUIRED_FIELD_KEYS)[number];

type EventFieldRow = {
  id: string;
  field_key: FieldKey;
};

type RegistrationUserRow = {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type RegistrationRow = {
  id: string;
  users: RegistrationUserRow | RegistrationUserRow[] | null;
};

type RegistrationAnswerRow = {
  registration_id: string;
  event_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown;
};

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
  UPCOMING_SUNDAY_EVENT_ID: z.string().trim().uuid('UPCOMING_SUNDAY_EVENT_ID must be a valid UUID'),
  CRON_RESEND_FROM_EMAIL: z
    .string()
    .trim()
    .email('CRON_RESEND_FROM_EMAIL must be a valid email address')
    .default('onboarding@resend.dev'),
});

type CronEnvironment = {
  resendApiKey: string;
  targetEmail: string;
  eventId: string;
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
    UPCOMING_SUNDAY_EVENT_ID: Deno.env.get('UPCOMING_SUNDAY_EVENT_ID') ?? '',
    RESEND_FROM_EMAIL: Deno.env.get('RESEND_FROM_EMAIL') ?? undefined,
  });

  if (!parsed.success) {
    console.error('[cron_upcoming_sunday_excused_export_email] Invalid cron env', {
      issues: parsed.error.issues,
    });
    return null;
  }

  return {
    resendApiKey: parsed.data.RESEND_API_KEY,
    targetEmail: parsed.data.UPCOMING_SUNDAY_TARGET_EMAIL,
    eventId: parsed.data.UPCOMING_SUNDAY_EVENT_ID,
    fromEmail: parsed.data.CRON_RESEND_FROM_EMAIL,
  };
}

function getRegistrationUser(value: RegistrationRow['users']): RegistrationUserRow | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

function readAnswerValue(answer: RegistrationAnswerRow): unknown {
  if (answer.answer_json !== null && answer.answer_json !== undefined) {
    return answer.answer_json;
  }

  if (answer.answer_text !== null) {
    try {
      return JSON.parse(answer.answer_text);
    } catch {
      return answer.answer_text;
    }
  }

  if (answer.answer_boolean !== null) {
    return answer.answer_boolean;
  }

  if (answer.answer_date !== null) {
    return answer.answer_date;
  }

  if (answer.answer_number !== null) {
    return answer.answer_number;
  }

  return null;
}

function normalizeValueToText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeValueToText(entry))
      .filter(Boolean)
      .join(', ');
  }

  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function computeForthcomingSundayDateInPht(now = new Date()): string {
  const phtNowMs = now.getTime() + CRON_TIMEZONE_OFFSET_MS;
  const phtNow = new Date(phtNowMs);
  const dayOfWeek = phtNow.getUTCDay();
  const daysUntilSunday = (7 - dayOfWeek) % 7 || 7;

  const targetMs = phtNowMs + daysUntilSunday * DAY_MS;
  const targetDate = new Date(targetMs);
  const year = targetDate.getUTCFullYear();
  const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function resolveTargetSundayDate(req: Request): string {
  const requestedDate = new URL(req.url).searchParams.get('target_sunday_date')?.trim();
  return requestedDate || computeForthcomingSundayDateInPht();
}

function encodeBase64Utf8(value: string): string {
  const bytes = new TextEncoder().encode(value);
  const chunkSize = 0x8000;
  let binary = '';

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function sendEmailWithAttachment(options: {
  resendApiKey: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  html: string;
  filename: string;
  content: string;
}): Promise<{ ok: true } | { ok: false; status: number; body: string }> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: options.fromEmail,
      to: [options.toEmail],
      subject: options.subject,
      html: options.html,
      attachments: [
        {
          filename: options.filename,
          content: encodeBase64Utf8(options.content),
          type: 'application/json',
        },
      ],
    }),
  });

  if (!response.ok) {
    console.error('[cron_upcoming_sunday_excused_export_email] Resend API request failed', {
      status: response.status,
      body: await response.text(),
    });
    return {
      ok: false,
      status: response.status,
      body: await response.text(),
    };
  }

  return { ok: true };
}

Deno.serve(async (req) => {
  console.log('[cron_upcoming_sunday_excused_export_email] Request received', {
    method: req.method,
    origin: req.headers.get('origin'),
    hasAuthorizationHeader: req.headers.has('authorization'),
    contentType: req.headers.get('content-type'),
  });

  const guard = await useEdgeHook({
    req,
    functionName: 'cron-upcoming-sunday-excused-export-email',
    method: 'POST',
    publicRateLimit: {
      scope: 'cron-upcoming-sunday-excused-export-email',
      windowMs: RATE_LIMIT_PRESETS.cron.upcomingSundayExcusedExportEmail.windowMs,
      maxHits: RATE_LIMIT_PRESETS.cron.upcomingSundayExcusedExportEmail.maxHits,
    },
  });

  if (!guard.valid) {
    console.error('[cron_upcoming_sunday_excused_export_email] Request rejected by edge hook', {
      requestId: guard.requestId,
      status: guard.response.status,
    });
    return guard.response;
  }

  console.log('[cron_upcoming_sunday_excused_export_email] Edge hook accepted request', {
    requestId: guard.requestId,
  });

  try {
    const targetSundayDate = resolveTargetSundayDate(req);
    console.log('[cron_upcoming_sunday_excused_export_email] Computed target date', {
      requestId: guard.requestId,
      targetSundayDate,
    });

    const cronEnv = parseCronEnvironment();
    if (!cronEnv) {
      console.error('[cron_upcoming_sunday_excused_export_email] Cron environment is invalid', {
        requestId: guard.requestId,
      });
      return jsonResponse(500, {
        success: false,
        error: 'Cron email environment not configured',
      });
    }

    const { data: eventFields, error: eventFieldsError } = await guard.client
      .from('event_fields')
      .select('id, field_key')
      .eq('event_id', cronEnv.eventId)
      .in('field_key', [...REQUIRED_FIELD_KEYS])
      .returns<EventFieldRow[]>();

    console.log('[cron_upcoming_sunday_excused_export_email] Event fields lookup completed', {
      requestId: guard.requestId,
      fieldCount: eventFields?.length ?? 0,
      hasError: Boolean(eventFieldsError),
    });

    if (eventFieldsError) {
      console.error(
        '[cron_upcoming_sunday_excused_export_email] Event fields lookup failed',
        eventFieldsError,
      );
      return jsonResponse(500, {
        success: false,
        error: 'Failed to load event fields',
      });
    }

    const fieldIdToKey = new Map<string, FieldKey>();
    for (const field of eventFields ?? []) {
      fieldIdToKey.set(field.id, field.field_key);
    }

    const requestedFieldIds = (eventFields ?? []).map((field) => field.id);

    // Find the event_field ID for 'request_date'
    const requestDateFieldId = (eventFields ?? []).find((f) => f.field_key === 'request_date')?.id;

    if (!requestDateFieldId) {
      console.error('[cron_upcoming_sunday_excused_export_email] request_date field not found');
      return jsonResponse(500, {
        success: false,
        error: 'request_date field not configured for event',
      });
    }

    // Filter by request_date at database level to reduce result set
    const { data: requestDateAnswers, error: requestDateAnswersError } = await guard.client
      .from('registration_answers')
      .select('registration_id')
      .eq('event_field_id', requestDateFieldId)
      .or(`answer_text.ilike.%${targetSundayDate}%,answer_date.eq.${targetSundayDate}`)
      .returns<{ registration_id: string }[]>();

    console.log(
      '[cron_upcoming_sunday_excused_export_email] Request date answers lookup completed',
      {
        requestId: guard.requestId,
        matchingAnswerCount: requestDateAnswers?.length ?? 0,
        hasError: Boolean(requestDateAnswersError),
      },
    );

    if (requestDateAnswersError) {
      console.error(
        '[cron_upcoming_sunday_excused_export_email] Request date filter lookup failed',
        requestDateAnswersError,
      );
      return jsonResponse(500, {
        success: false,
        error: 'Failed to filter by request_date',
      });
    }

    const registrationIds = (requestDateAnswers ?? []).map((answer) => answer.registration_id);
    console.log('[cron_upcoming_sunday_excused_export_email] Registration IDs resolved', {
      requestId: guard.requestId,
      registrationCount: registrationIds.length,
    });

    if (registrationIds.length === 0) {
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

      console.log('[cron_upcoming_sunday_excused_export_email] Empty export email completed', {
        requestId: guard.requestId,
        ok: emailResult.ok,
        status: emailResult.ok ? 200 : emailResult.status,
      });

      if (!emailResult.ok) {
        console.error('[cron_upcoming_sunday_excused_export_email] Resend send failed', {
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

    // Fetch full registrations and answers only for filtered registration IDs
    const { data: registrations, error: registrationsError } = await guard.client
      .from('registrations')
      .select('id, users!inner(first_name, last_name, email)')
      .eq('event_id', cronEnv.eventId)
      .neq('status', 'cancelled')
      .in('id', registrationIds)
      .returns<RegistrationRow[]>();

    console.log('[cron_upcoming_sunday_excused_export_email] Registrations lookup completed', {
      requestId: guard.requestId,
      registrationCount: registrations?.length ?? 0,
      hasError: Boolean(registrationsError),
    });

    if (registrationsError) {
      console.error(
        '[cron_upcoming_sunday_excused_export_email] Registrations lookup failed',
        registrationsError,
      );
      return jsonResponse(500, {
        success: false,
        error: 'Failed to load registrations',
      });
    }

    let answers: RegistrationAnswerRow[] = [];
    if (registrationIds.length > 0 && requestedFieldIds.length > 0) {
      const { data: answerRows, error: answersError } = await guard.client
        .from('registration_answers')
        .select(
          'registration_id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json',
        )
        .in('registration_id', registrationIds)
        .in('event_field_id', requestedFieldIds)
        .returns<RegistrationAnswerRow[]>();

      console.log('[cron_upcoming_sunday_excused_export_email] Answers lookup completed', {
        requestId: guard.requestId,
        answerCount: answerRows?.length ?? 0,
        hasError: Boolean(answersError),
      });

      if (answersError) {
        console.error(
          '[cron_upcoming_sunday_excused_export_email] Registration answers lookup failed',
          answersError,
        );
        return jsonResponse(500, {
          success: false,
          error: 'Failed to load registration answers',
        });
      }

      answers = answerRows ?? [];
    }

    const answersByRegistration = new Map<string, Partial<Record<FieldKey, unknown>>>();
    for (const answer of answers) {
      const fieldKey = fieldIdToKey.get(answer.event_field_id);
      if (!fieldKey) {
        continue;
      }

      const current = answersByRegistration.get(answer.registration_id) ?? {};
      current[fieldKey] = readAnswerValue(answer);
      answersByRegistration.set(answer.registration_id, current);
    }

    const payload: SundayRequestRecord[] = [];

    for (const registration of registrations ?? []) {
      const user = getRegistrationUser(registration.users);
      if (!user) {
        continue;
      }

      const answerMap = answersByRegistration.get(registration.id) ?? {};

      payload.push({
        firstName: (user.first_name ?? '').trim(),
        lastName: (user.last_name ?? '').trim(),
        requestDate: targetSundayDate,
        services: normalizeValueToText(answerMap.services),
        reason: normalizeValueToText(answerMap.reason),
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

    console.log('[cron_upcoming_sunday_excused_export_email] Export email completed', {
      requestId: guard.requestId,
      recordCount: payload.length,
      ok: emailResult.ok,
      status: emailResult.ok ? 200 : emailResult.status,
    });

    if (!emailResult.ok) {
      console.error('[cron_upcoming_sunday_excused_export_email] Resend send failed', {
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
      event_id: cronEnv.eventId,
      target_sunday_date: targetSundayDate,
      recipient: cronEnv.targetEmail,
      row_count: payload.length,
      filename,
    });
  } catch (error) {
    console.error('[cron_upcoming_sunday_excused_export_email] Unexpected error', {
      requestId: guard.requestId,
      error,
    });
    return jsonResponse(500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while processing the request.',
    });
  }
});
