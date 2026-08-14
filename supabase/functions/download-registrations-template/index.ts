import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import {
  buildUtcTimestampForFilename,
  escapeCsvField,
  sanitizeFilenamePart,
} from '@/shared/csv.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const requestSchema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
});

type RequestPayload = z.infer<typeof requestSchema>;

type EventFieldRow = {
  id: string;
  field_key: string;
  display_order: number;
};

type UserRow = {
  id: string;
  member_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: unknown;
  category: unknown;
};

type RegistrationRow = {
  id: string;
  user_id: string;
};

type RegistrationAnswerRow = {
  registration_id: string;
  event_field_id: string;
  answer_text: string | null;
};

function readOptionalText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Reverses the JSON-encoded answer_text values back into flat, editable CSV cell text. */
function formatAnswerForCsv(rawAnswerText: string | null): string {
  if (!rawAnswerText) {
    return '';
  }

  try {
    const parsed = JSON.parse(rawAnswerText) as unknown;

    if (Array.isArray(parsed)) {
      return parsed
        .map((value) => String(value).trim())
        .filter(Boolean)
        .join('|');
    }

    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed as Record<string, unknown>)
        .map(
          ([key, value]) =>
            `${key}:${value === true ? 'true' : value === false ? 'false' : String(value)}`,
        )
        .join('|');
    }

    return rawAnswerText;
  } catch {
    return rawAnswerText;
  }
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'download-registrations-template',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'download-registrations-template',
      windowMs: RATE_LIMIT_PRESETS.downloadRegistrationsTemplate.windowMs,
      maxHits: RATE_LIMIT_PRESETS.downloadRegistrationsTemplate.maxHits,
    },
    schema: requestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { event_id }: RequestPayload = guard.data;
    const adminClient = guard.client;

    const { data: eventData } = (await adminClient
      .from('events')
      .select('title')
      .eq('id', event_id)
      .maybeSingle()) as { data: { title: string | null } | null };

    const { data: fields, error: fieldsError } = await adminClient
      .from('event_fields')
      .select('id, field_key, display_order')
      .eq('event_id', event_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (fieldsError) {
      return errorResponse(
        corsHeaders,
        500,
        'Failed to read registration fields',
        fieldsError.message,
      );
    }

    const safeFields = (fields ?? []) as EventFieldRow[];

    const { data: users, error: usersError } = await adminClient
      .from('users')
      .select('id, member_id, full_name, email, phone, role, category')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (usersError) {
      return errorResponse(corsHeaders, 500, 'Failed to read members', usersError.message);
    }

    const safeUsers = (users ?? []) as UserRow[];

    const { data: registrations, error: registrationsError } = await adminClient
      .from('registrations')
      .select('id, user_id')
      .eq('event_id', event_id)
      .in('status', ['submitted', 'updated']);

    if (registrationsError) {
      return errorResponse(
        corsHeaders,
        500,
        'Failed to read existing registrations',
        registrationsError.message,
      );
    }

    const safeRegistrations = (registrations ?? []) as RegistrationRow[];
    const registrationIdByUserId = new Map(
      safeRegistrations.map((registration) => [registration.user_id, registration.id]),
    );
    const registrationIdSet = new Set(safeRegistrations.map((registration) => registration.id));

    // Filter by event_field_id (bounded by this event's field count) instead of
    // registration_id (can be thousands of rows), which previously hit PostgREST's URI length limit.
    const fieldIds = safeFields.map((field) => field.id);
    const { data: answers, error: answersError } =
      fieldIds.length > 0 && registrationIdSet.size > 0
        ? await adminClient
            .from('registration_answers')
            .select('registration_id, event_field_id, answer_text')
            .in('event_field_id', fieldIds)
        : { data: [], error: null };

    if (answersError) {
      return errorResponse(
        corsHeaders,
        500,
        'Failed to read existing registration answers',
        answersError.message,
      );
    }

    const fieldKeyById = new Map(safeFields.map((field) => [field.id, field.field_key]));

    const answersByRegistrationId = new Map<string, Map<string, string>>();
    for (const answer of (answers ?? []) as RegistrationAnswerRow[]) {
      if (!registrationIdSet.has(answer.registration_id)) continue;

      const fieldKey = fieldKeyById.get(answer.event_field_id);
      if (!fieldKey) continue;

      const byField =
        answersByRegistrationId.get(answer.registration_id) ?? new Map<string, string>();
      byField.set(fieldKey, formatAnswerForCsv(answer.answer_text));
      answersByRegistrationId.set(answer.registration_id, byField);
    }

    const headers = [
      'registration_id',
      'member_id',
      'full_name',
      'email',
      'phone',
      'role',
      'category',
      ...safeFields.map((field) => field.field_key),
    ];

    const lines = [headers.map(escapeCsvField).join(',')];

    for (const user of safeUsers) {
      const registrationId = registrationIdByUserId.get(user.id) ?? '';
      const answersForUser =
        answersByRegistrationId.get(registrationId) ?? new Map<string, string>();

      const row = [
        registrationId,
        user.member_id ?? '',
        user.full_name ?? '',
        user.email ?? '',
        user.phone ?? '',
        readOptionalText(user.role),
        readOptionalText(user.category),
        ...safeFields.map((field) => answersForUser.get(field.field_key) ?? ''),
      ];

      lines.push(row.map(escapeCsvField).join(','));
    }

    const csvText = lines.join('\n');
    const eventTitlePart = sanitizeFilenamePart(eventData?.title ?? 'event');
    const filename = `${eventTitlePart}-registrations-template-${buildUtcTimestampForFilename(new Date())}.csv`;

    return new Response(csvText, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[download-registrations-template] unhandled error', error);
    return errorResponse(guard.corsHeaders, 500, 'Unexpected server error');
  }
});
