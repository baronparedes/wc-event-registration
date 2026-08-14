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

type PublicRegistrationRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  email: string | null;
  phone: string | null;
};

type PublicRegistrationAnswerRow = {
  public_registration_id: string;
  event_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown;
};

function formatJsonAnswerValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter(Boolean)
      .join('|');
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .map(
        ([key, entry]) =>
          `${key}:${entry === true ? 'true' : entry === false ? 'false' : String(entry)}`,
      )
      .join('|');
  }

  return String(value);
}

function formatAnswerForCsv(answer: PublicRegistrationAnswerRow): string {
  if (answer.answer_json !== null && answer.answer_json !== undefined) {
    return formatJsonAnswerValue(answer.answer_json);
  }

  if (answer.answer_boolean !== null) {
    return answer.answer_boolean ? 'true' : 'false';
  }

  if (answer.answer_number !== null) {
    return String(answer.answer_number);
  }

  if (answer.answer_date !== null) {
    return answer.answer_date;
  }

  if (!answer.answer_text) {
    return '';
  }

  try {
    const parsed = JSON.parse(answer.answer_text) as unknown;
    return formatJsonAnswerValue(parsed);
  } catch {
    return answer.answer_text;
  }
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'download-public-registrations-template',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'download-public-registrations-template',
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
      .in('applicability', ['guests', 'both'])
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

    const { data: registrations, error: registrationsError } = await adminClient
      .from('public_registrations')
      .select('id, first_name, last_name, nickname, email, phone')
      .eq('event_id', event_id)
      .in('status', ['submitted', 'updated'])
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true })
      .order('email', { ascending: true });

    if (registrationsError) {
      return errorResponse(
        corsHeaders,
        500,
        'Failed to read existing public registrations',
        registrationsError.message,
      );
    }

    const safeRegistrations = (registrations ?? []) as PublicRegistrationRow[];
    const registrationIdSet = new Set(safeRegistrations.map((registration) => registration.id));

    const fieldIds = safeFields.map((field) => field.id);
    const { data: answers, error: answersError } =
      fieldIds.length > 0 && registrationIdSet.size > 0
        ? await adminClient
            .from('public_registration_answers')
            .select(
              'public_registration_id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json',
            )
            .in('event_field_id', fieldIds)
        : { data: [], error: null };

    if (answersError) {
      return errorResponse(
        corsHeaders,
        500,
        'Failed to read existing public registration answers',
        answersError.message,
      );
    }

    const fieldKeyById = new Map(safeFields.map((field) => [field.id, field.field_key]));

    const answersByRegistrationId = new Map<string, Map<string, string>>();
    for (const answer of (answers ?? []) as PublicRegistrationAnswerRow[]) {
      if (!registrationIdSet.has(answer.public_registration_id)) continue;

      const fieldKey = fieldKeyById.get(answer.event_field_id);
      if (!fieldKey) continue;

      const byField =
        answersByRegistrationId.get(answer.public_registration_id) ?? new Map<string, string>();
      byField.set(fieldKey, formatAnswerForCsv(answer));
      answersByRegistrationId.set(answer.public_registration_id, byField);
    }

    const headers = [
      'public_registration_id',
      'first_name',
      'last_name',
      'nickname',
      'email',
      'phone',
      ...safeFields.map((field) => field.field_key),
    ];

    const lines = [headers.map(escapeCsvField).join(',')];

    for (const registration of safeRegistrations) {
      const answersForRegistration =
        answersByRegistrationId.get(registration.id) ?? new Map<string, string>();

      const row = [
        registration.id,
        registration.first_name ?? '',
        registration.last_name ?? '',
        registration.nickname ?? '',
        registration.email ?? '',
        registration.phone ?? '',
        ...safeFields.map((field) => answersForRegistration.get(field.field_key) ?? ''),
      ];

      lines.push(row.map(escapeCsvField).join(','));
    }

    const csvText = lines.join('\n');
    const eventTitlePart = sanitizeFilenamePart(eventData?.title ?? 'event');
    const filename = `${eventTitlePart}-public-registrations-template-${buildUtcTimestampForFilename(new Date())}.csv`;

    return new Response(csvText, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('[download-public-registrations-template] unhandled error', error);
    return errorResponse(guard.corsHeaders, 500, 'Unexpected server error');
  }
});
