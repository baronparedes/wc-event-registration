import { createClient } from '@supabase/supabase-js';

import { parseFunctionEnvironment, z } from '@/shared/validation.ts';

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

function isAuthorizedCronRequest(req: Request, expectedServiceRoleKey: string): boolean {
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token || !expectedServiceRoleKey) {
    return false;
  }

  return token === expectedServiceRoleKey;
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

function normalizeDateValue(value: unknown): string {
  const text = normalizeValueToText(value);
  if (!text) {
    return '';
  }

  const exactDateMatch = text.match(/\d{4}-\d{2}-\d{2}/);
  if (exactDateMatch) {
    return exactDateMatch[0];
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
  const day = String(parsed.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    return {
      ok: false,
      status: response.status,
      body: await response.text(),
    };
  }

  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse(405, {
      success: false,
      error: 'Method not allowed',
    });
  }

  const functionEnv = parseFunctionEnvironment();
  if (!functionEnv) {
    return jsonResponse(500, {
      success: false,
      error: 'Supabase environment not configured',
    });
  }

  if (!isAuthorizedCronRequest(req, functionEnv.supabaseServiceKey)) {
    return jsonResponse(401, {
      success: false,
      error: 'Unauthorized',
    });
  }

  const cronEnv = parseCronEnvironment();
  if (!cronEnv) {
    return jsonResponse(500, {
      success: false,
      error: 'Cron email environment not configured',
    });
  }

  const supabase = createClient(functionEnv.supabaseUrl, functionEnv.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const targetSundayDate = computeForthcomingSundayDateInPht();

  const { data: eventFields, error: eventFieldsError } = await supabase
    .from('event_fields')
    .select('id, field_key')
    .eq('event_id', cronEnv.eventId)
    .in('field_key', [...REQUIRED_FIELD_KEYS])
    .returns<EventFieldRow[]>();

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

  const { data: registrations, error: registrationsError } = await supabase
    .from('registrations')
    .select('id, users!inner(first_name, last_name, email)')
    .eq('event_id', cronEnv.eventId)
    .neq('status', 'cancelled')
    .returns<RegistrationRow[]>();

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

  const registrationIds = (registrations ?? []).map((registration) => registration.id);

  let answers: RegistrationAnswerRow[] = [];
  if (registrationIds.length > 0 && requestedFieldIds.length > 0) {
    const { data: answerRows, error: answersError } = await supabase
      .from('registration_answers')
      .select(
        'registration_id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json',
      )
      .in('registration_id', registrationIds)
      .in('event_field_id', requestedFieldIds)
      .returns<RegistrationAnswerRow[]>();

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
    const requestDate = normalizeDateValue(answerMap.request_date);

    if (!requestDate || requestDate !== targetSundayDate) {
      continue;
    }

    payload.push({
      firstName: (user.first_name ?? '').trim(),
      lastName: (user.last_name ?? '').trim(),
      requestDate,
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
});
