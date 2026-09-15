import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, successResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const requestSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  monthIndex: z.number().int().min(0).max(11), // 0-11
});

type GetExcusedMembersRequest = z.infer<typeof requestSchema>;

type EventFieldRelation = {
  field_key: string;
};

type RegistrationAnswerRow = {
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown;
  event_fields: EventFieldRelation | EventFieldRelation[] | null;
};

type UserRelation = {
  member_id: string | null;
  id: string | null;
};

type RegistrationRow = {
  id: string;
  users: UserRelation | UserRelation[] | null;
  registration_answers: RegistrationAnswerRow[] | null;
};

export type ExcusedMemberRecord = {
  userId: string;
  memberId: string;
  requestDate: string;
  services: string; // The services they are excused from
  reason: string; // The reason they are excused
};

function readAnswerValue(answer: RegistrationAnswerRow): unknown {
  if (answer.answer_date !== null && answer.answer_date !== undefined) {
    return answer.answer_date;
  }
  if (answer.answer_json !== null && answer.answer_json !== undefined) {
    return answer.answer_json;
  }
  if (
    answer.answer_text !== null &&
    answer.answer_text !== undefined &&
    answer.answer_text !== ''
  ) {
    try {
      return JSON.parse(answer.answer_text);
    } catch {
      return answer.answer_text;
    }
  }
  if (answer.answer_boolean !== null) {
    return answer.answer_boolean;
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

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'get-excused-members',
    method: 'POST',
    requireAdmin: true,
    allowedRoles: ['admin', 'super_admin', 'slod'],
    rateLimit: {
      scope: 'get-excused-members',
      windowMs: RATE_LIMIT_PRESETS.getExcusedMembers.windowMs,
      maxHits: RATE_LIMIT_PRESETS.getExcusedMembers.maxHits,
    },
    schema: requestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { year, monthIndex }: GetExcusedMembersRequest = guard.data;
    const supabase = guard.client;
    const eventId = Deno.env.get('UPCOMING_SUNDAY_EVENT_ID');

    const monthStr = String(monthIndex + 1).padStart(2, '0');
    const datePrefix = `${year}-${monthStr}`;
    const startDate = `${datePrefix}-01`;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const endDate = `${datePrefix}-${String(daysInMonth).padStart(2, '0')}`;

    console.log('[get-excused-members] Starting request processing', {
      requestId: guard.requestId,
      year,
      monthIndex,
      datePrefix,
      startDate,
      endDate,
      eventId: eventId ?? 'NOT_SET',
    });

    if (!eventId) {
      console.error('[get-excused-members] Event ID not configured', {
        requestId: guard.requestId,
      });
      return errorResponse(corsHeaders, 500, 'Event ID not configured');
    }

    // Pass 1: Find registration IDs that have a request_date matching the target month/year
    console.log('[get-excused-members] Executing Pass 1 date filter query', {
      requestId: guard.requestId,
      datePrefix,
      startDate,
      endDate,
      eventId,
    });

    const { data: dateAnswers, error: dateAnswersError } = await supabase
      .from('registration_answers')
      .select(
        'registration_id, event_fields!inner(field_key), registrations!inner(status, event_id)',
      )
      .eq('registrations.event_id', eventId)
      .neq('registrations.status', 'cancelled')
      .eq('event_fields.field_key', 'request_date')
      .or(
        `and(answer_date.gte.${startDate},answer_date.lte.${endDate}),answer_text.ilike.%${datePrefix}%`,
      );

    if (dateAnswersError) {
      console.error('[get-excused-members] Pass 1 query error', {
        requestId: guard.requestId,
        error: dateAnswersError,
      });
      return errorResponse(
        corsHeaders,
        500,
        'Failed to query matching excused requests',
        dateAnswersError.message,
      );
    }

    const registrationIds = Array.from(
      new Set(
        ((dateAnswers as { registration_id: string }[] | null) ?? [])
          .map((a) => a.registration_id)
          .filter(Boolean),
      ),
    );

    console.log('[get-excused-members] Pass 1 query complete', {
      requestId: guard.requestId,
      matchingRows: dateAnswers?.length ?? 0,
      uniqueRegistrationCount: registrationIds.length,
      registrationIds,
    });

    if (registrationIds.length === 0) {
      console.log('[get-excused-members] No registrations matched, returning empty array', {
        requestId: guard.requestId,
        datePrefix,
      });
      return successResponse(corsHeaders, { records: [] });
    }

    // Pass 2: Fetch member details and answers for only the matching registrations
    console.log('[get-excused-members] Executing Pass 2 registrations lookup', {
      requestId: guard.requestId,
      registrationCount: registrationIds.length,
    });

    const { data: registrations, error: registrationsError } = await supabase
      .from('registrations')
      .select(
        `
        id,
        users!inner (
          member_id,
          id
        ),
        registration_answers (
          answer_text,
          answer_date,
          answer_number,
          answer_boolean,
          answer_json,
          event_fields (
            field_key
          )
        )
      `,
      )
      .in('id', registrationIds);

    if (registrationsError) {
      console.error('[get-excused-members] Pass 2 query error', {
        requestId: guard.requestId,
        error: registrationsError,
      });
      return errorResponse(
        corsHeaders,
        500,
        'Failed to load registrations',
        registrationsError.message,
      );
    }

    console.log('[get-excused-members] Pass 2 records fetched', {
      requestId: guard.requestId,
      fetchedCount: registrations?.length ?? 0,
    });

    const records: ExcusedMemberRecord[] = [];

    for (const reg of (registrations as RegistrationRow[] | null) ?? []) {
      const memberId = Array.isArray(reg.users) ? reg.users[0]?.member_id : reg.users?.member_id;
      const userId = Array.isArray(reg.users) ? reg.users[0]?.id : reg.users?.id;
      if (!memberId || !userId) continue;

      let requestDate = '';
      let services = '';
      let reason = '';

      for (const answer of reg.registration_answers ?? []) {
        const fieldKey = Array.isArray(answer.event_fields)
          ? answer.event_fields[0]?.field_key
          : answer.event_fields?.field_key;

        if (fieldKey === 'request_date') {
          requestDate = normalizeValueToText(readAnswerValue(answer));
        } else if (fieldKey === 'services') {
          services = normalizeValueToText(readAnswerValue(answer));
        } else if (fieldKey === 'reason') {
          reason = normalizeValueToText(readAnswerValue(answer));
        }
      }

      const cleanDate = requestDate.split('T')[0].trim();
      const dateParts = cleanDate.split('-');
      const isDateInMonth =
        dateParts.length >= 3 &&
        parseInt(dateParts[0], 10) === year &&
        parseInt(dateParts[1], 10) === monthIndex + 1;

      if (isDateInMonth || cleanDate.startsWith(datePrefix)) {
        records.push({
          userId,
          memberId,
          requestDate: cleanDate,
          services,
          reason,
        });
      }
    }

    console.log('[get-excused-members] Finished building response', {
      requestId: guard.requestId,
      recordsCount: records.length,
    });

    return successResponse(corsHeaders, { records });
  } catch (err) {
    console.error('[get-excused-members] Unexpected exception', {
      requestId: guard.requestId,
      error: err instanceof Error ? err.stack || err.message : err,
    });
    const message = err instanceof Error ? err.message : 'Internal server error';
    return errorResponse(corsHeaders, 500, message);
  }
});
