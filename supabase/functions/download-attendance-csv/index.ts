import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import {
  buildUtcTimestampForFilename,
  escapeCsvField,
  formatTimestampInTimeZone,
  sanitizeFilenamePart,
} from '@/shared/csv.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const requestSchema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
});

type RequestPayload = z.infer<typeof requestSchema>;

type AttendanceFieldRow = {
  id: string;
  field_key: string;
  field_type: string;
  label: string;
  is_active: boolean;
  display_order: number;
};

type AttendanceAnswerRow = {
  attendance_field_id: string;
  field_key: string;
  field_type: string;
  answer_text: string | null;
  answer_number: number | null;
};

type RegistrationAnswerRow = {
  field_key: string;
  answer_text: string | null;
  answer_number: number | null;
};

type EventContextRow = {
  title: string | null;
  attendance_fields: AttendanceFieldRow[] | null;
};

type EventAttendeeRow = {
  attendee_kind: 'registered' | 'public';
  registration_id: string | null;
  public_registration_id: string | null;
  member_id: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  category: string | null;
  submitted_at: string | null;
  attendance_answers: AttendanceAnswerRow[] | null;
  registration_answers: RegistrationAnswerRow[] | null;
};

type EventAttendeesRpcResponse = {
  attendance_enabled: boolean;
  results: EventAttendeeRow[] | null;
};

const PH_TIME_ZONE = 'Asia/Manila';

function formatAnswerValue(
  fieldType: string,
  answerText: string | null,
  answerNumber: number | null,
): string {
  if (answerNumber !== null && answerNumber !== undefined) {
    return String(answerNumber);
  }

  if (!answerText) {
    return '';
  }

  if (fieldType === 'multi_select') {
    try {
      const parsed = JSON.parse(answerText);
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => String(value).trim())
          .filter(Boolean)
          .join('|');
      }
    } catch {
      return answerText;
    }
  }

  if (fieldType === 'multi_select_toggle') {
    try {
      const parsed = JSON.parse(answerText);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return Object.entries(parsed as Record<string, unknown>)
          .map(
            ([key, value]) =>
              `${key}:${value === true ? 'true' : value === false ? 'false' : String(value)}`,
          )
          .join('|');
      }
    } catch {
      return answerText;
    }
  }

  return answerText;
}

function buildAnswerCellsAndMetadata(
  fields: AttendanceFieldRow[],
  answersByField: Map<string, { answer_text: string | null; answer_number: number | null }>,
): { answerCells: string[]; metadataJson: string } {
  const answerCells: string[] = [];
  const metadata: Record<string, string> = {};

  for (let i = 0; i < fields.length; i += 1) {
    const field = fields[i];
    const answer = answersByField.get(field.id);
    const formattedAnswer = formatAnswerValue(
      field.field_type,
      answer?.answer_text ?? null,
      answer?.answer_number ?? null,
    );

    answerCells.push(formattedAnswer);
    if (formattedAnswer) {
      metadata[field.field_key] = formattedAnswer;
    }
  }

  return { answerCells, metadataJson: JSON.stringify(metadata) };
}

function buildRegistrationMetadata(registrationAnswers: RegistrationAnswerRow[] | null): string {
  if (!registrationAnswers?.length) {
    return JSON.stringify({});
  }

  const metadata: Record<string, string> = {};
  registrationAnswers.forEach((answer) => {
    const value =
      answer.answer_number !== null && answer.answer_number !== undefined
        ? String(answer.answer_number)
        : (answer.answer_text ?? '');

    if (value) {
      metadata[answer.field_key] = value;
    }
  });

  return JSON.stringify(metadata);
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'download-attendance-csv',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'download-attendance-csv',
      windowMs: RATE_LIMIT_PRESETS.attendanceCsvExport.windowMs,
      maxHits: RATE_LIMIT_PRESETS.attendanceCsvExport.maxHits,
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

    const { data: eventContextData, error: eventContextError } = await adminClient
      .from('events')
      .select(
        'title, attendance_fields(id, field_key, field_type, label, is_active, display_order)',
      )
      .eq('id', event_id)
      .single();

    if (eventContextError || !eventContextData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read event attendance context' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const eventContext = eventContextData as EventContextRow;

    const safeFields = ((eventContext.attendance_fields ?? []) as AttendanceFieldRow[])
      .filter((field) => field.is_active)
      .sort((a, b) => a.display_order - b.display_order);

    const rpc = adminClient.rpc.bind(adminClient) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => { single: () => PromiseLike<{ data: unknown; error: unknown }> };

    const { data: attendeesData, error: attendeesError } = await rpc('list_event_attendees_v2', {
      p_event_id: event_id,
    }).single();

    if (attendeesError || !attendeesData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read event attendees' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const attendeePayload = attendeesData as EventAttendeesRpcResponse;
    if (!attendeePayload.attendance_enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Attendance tracking is disabled for this event.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const attendees = (
      Array.isArray(attendeePayload.results) ? attendeePayload.results : []
    ) as EventAttendeeRow[];

    const header = [
      'attendee_kind',
      'registration_date',
      'registration_id',
      'public_registration_id',
      'member_id',
      'full_name',
      'email',
      'role',
      'category',
      'registration_answers_metadata',
      ...safeFields.map((field) => field.field_key),
    ];

    const rows = attendees.map((attendee) => {
      const answersByField = new Map<
        string,
        { answer_text: string | null; answer_number: number | null }
      >();
      (attendee.attendance_answers ?? []).forEach((answer) => {
        answersByField.set(answer.attendance_field_id, {
          answer_text: answer.answer_text,
          answer_number: answer.answer_number,
        });
      });

      const { answerCells } = buildAnswerCellsAndMetadata(safeFields, answersByField);
      const metadataJson = buildRegistrationMetadata(attendee.registration_answers ?? null);

      const isPublicAttendee = attendee.attendee_kind === 'public';
      return [
        attendee.attendee_kind,
        formatTimestampInTimeZone(attendee.submitted_at ?? '', PH_TIME_ZONE, 'PHT'),
        isPublicAttendee ? '' : (attendee.registration_id ?? ''),
        isPublicAttendee
          ? (attendee.public_registration_id ?? attendee.registration_id ?? '')
          : (attendee.public_registration_id ?? ''),
        isPublicAttendee ? '' : (attendee.member_id ?? ''),
        attendee.full_name ?? (isPublicAttendee ? 'Guest Attendee' : ''),
        attendee.email ?? '',
        attendee.role ?? '',
        attendee.category ?? '',
        metadataJson,
        ...answerCells,
      ];
    });

    const csvRows = [header, ...rows].map((row) => row.map(escapeCsvField).join(',')).join('\n');

    const eventTitle = eventContext.title
      ? sanitizeFilenamePart(String(eventContext.title))
      : 'event';
    const timestamp = buildUtcTimestampForFilename(new Date());
    const filename = `${eventTitle || 'event'}-attendance-data-${timestamp}.csv`;

    return new Response(csvRows, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return errorResponse(corsHeaders, 500, 'Unexpected server error');
  }
});
