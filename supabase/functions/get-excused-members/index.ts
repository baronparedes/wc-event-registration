import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { z } from '@/shared/validation.ts';

const requestSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  monthIndex: z.number().int().min(0).max(11), // 0-11
});

const REQUIRED_FIELD_KEYS = ['request_date', 'services'] as const;
type FieldKey = (typeof REQUIRED_FIELD_KEYS)[number];

type RegistrationAnswerRow = {
  registration_id: string;
  event_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown;
};

export type ExcusedMemberRecord = {
  memberId: string;
  requestDate: string;
  services: string; // The services they are excused from
};

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
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(normalizeValueToText).join(', ');
  return String(value);
}

function jsonResponse(status: number, payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

Deno.serve(async (req) => {
  return await useEdgeHook(req, {
    functionName: 'get-excused-members',
    rateLimit: RATE_LIMIT_PRESETS.READ_MODERATE,
    scope: 'admin',
    onAccept: async (guard) => {
      const body = await req.json();
      const parsed = requestSchema.safeParse(body);

      if (!parsed.success) {
        return jsonResponse(400, { success: false, error: parsed.error });
      }

      const { year, monthIndex } = parsed.data;
      const eventId = Deno.env.get('UPCOMING_SUNDAY_EVENT_ID');

      if (!eventId) {
        return jsonResponse(500, { success: false, error: 'Event ID not configured' });
      }

      // Fetch event fields to find request_date and services fields
      const { data: eventFields, error: eventFieldsError } = await guard.client
        .from('event_fields')
        .select('id, field_key')
        .eq('event_id', eventId)
        .in('field_key', REQUIRED_FIELD_KEYS);

      if (eventFieldsError || !eventFields) {
        return jsonResponse(500, { success: false, error: 'Failed to fetch event fields' });
      }

      const fieldIdToKey = new Map<string, FieldKey>();
      for (const field of eventFields) {
        fieldIdToKey.set(field.id, field.field_key as FieldKey);
      }

      const requestDateFieldId = eventFields.find((f) => f.field_key === 'request_date')?.id;
      if (!requestDateFieldId) {
        return jsonResponse(200, { success: true, records: [] }); // If no such field, return empty
      }

      const monthStr = String(monthIndex + 1).padStart(2, '0');
      const datePrefix = `${year}-${monthStr}`;

      // Find registration IDs that have an answer for request_date in the given month
      const { data: requestDateAnswers, error: requestDateAnswersError } = await guard.client
        .from('registration_answers')
        .select('registration_id, answer_text, answer_date')
        .eq('event_field_id', requestDateFieldId)
        .or(`answer_text.ilike.%${datePrefix}%,answer_date.ilike.${datePrefix}%`);

      if (requestDateAnswersError) {
        return jsonResponse(500, { success: false, error: 'Failed to fetch answers' });
      }

      const registrationIds = (requestDateAnswers ?? []).map((a) => a.registration_id);

      if (registrationIds.length === 0) {
        return jsonResponse(200, { success: true, records: [] });
      }

      // Fetch all answers for these registrations for the requested fields
      const requestedFieldIds = eventFields.map((f) => f.id);

      const { data: answers, error: answersError } = await guard.client
        .from('registration_answers')
        .select('*')
        .in('registration_id', registrationIds)
        .in('event_field_id', requestedFieldIds);

      if (answersError) {
        return jsonResponse(500, { success: false, error: 'Failed to load registration answers' });
      }

      // Fetch member associations from registrations table
      const { data: registrations, error: registrationsError } = await guard.client
        .from('registrations')
        .select('id, users!inner(member_id)')
        .eq('event_id', eventId)
        .neq('status', 'cancelled')
        .in('id', registrationIds);

      if (registrationsError) {
        return jsonResponse(500, { success: false, error: 'Failed to load registrations' });
      }

      const answersByRegistration = new Map<string, Partial<Record<FieldKey, unknown>>>();
      for (const answer of answers ?? []) {
        const fieldKey = fieldIdToKey.get(answer.event_field_id);
        if (!fieldKey) continue;
        const current = answersByRegistration.get(answer.registration_id) ?? {};
        current[fieldKey] = readAnswerValue(answer);
        answersByRegistration.set(answer.registration_id, current);
      }

      const records: ExcusedMemberRecord[] = [];
      for (const reg of registrations ?? []) {
        // user association is required to know WHICH member this is
        const memberId = Array.isArray(reg.users) ? reg.users[0]?.member_id : reg.users?.member_id;
        if (!memberId) continue;

        const answerMap = answersByRegistration.get(reg.id) ?? {};

        const requestDate = normalizeValueToText(answerMap.request_date);
        // Only include if the date actually starts with our month string (extra safety check since ilike can sometimes match loosely)
        if (requestDate.startsWith(datePrefix)) {
          records.push({
            memberId,
            requestDate,
            services: normalizeValueToText(answerMap.services),
          });
        }
      }

      return jsonResponse(200, { success: true, records });
    },
  });
});
