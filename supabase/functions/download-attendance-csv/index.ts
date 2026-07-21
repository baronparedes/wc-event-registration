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
};

type RegistrationRow = {
  id: string;
  user_id: string;
  status: 'submitted' | 'updated' | 'cancelled';
  submitted_at: string;
};

type PublicRegistrationRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  status: 'submitted' | 'updated' | 'cancelled';
  submitted_at: string;
};

type UserRow = {
  id: string;
  member_id: string | null;
  full_name: string;
  email: string | null;
  role: string | null;
  category: string | null;
};

type AttendanceAnswerRow = {
  registration_id: string;
  attendance_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
};

type PublicAttendanceAnswerRow = {
  public_registration_id: string;
  attendance_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
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

    const { data: eventData } = await adminClient
      .from('events')
      .select('title')
      .eq('id', event_id)
      .single();

    const { data: settingsData, error: settingsError } = await adminClient
      .from('attendance_settings')
      .select('attendance_enabled')
      .eq('event_id', event_id)
      .maybeSingle();

    if (settingsError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read attendance settings' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!settingsData?.attendance_enabled) {
      return new Response(
        JSON.stringify({ success: false, error: 'Attendance tracking is disabled for this event' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: fields, error: fieldError } = await adminClient
      .from('attendance_fields')
      .select('id, field_key, field_type, label')
      .eq('event_id', event_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (fieldError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read attendance fields' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const safeFields = (fields ?? []) as AttendanceFieldRow[];

    const { data: registrations, error: registrationError } = await adminClient
      .from('registrations')
      .select('id, user_id, status, submitted_at')
      .eq('event_id', event_id)
      .in('status', ['submitted', 'updated']);

    if (registrationError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read member registrations' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const memberRegistrations = (registrations ?? []) as RegistrationRow[];
    const memberUserIds = memberRegistrations.map((registration) => registration.user_id);

    const { data: users, error: userError } = memberUserIds.length
      ? await adminClient
          .from('users')
          .select('id, member_id, full_name, email, role, category')
          .in('id', memberUserIds)
      : { data: [], error: null };

    if (userError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read member details' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: publicRegistrations, error: publicRegistrationError } = await adminClient
      .from('public_registrations')
      .select('id, first_name, last_name, email, status, submitted_at')
      .eq('event_id', event_id)
      .neq('status', 'cancelled');

    if (publicRegistrationError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read public registrations' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const safePublicRegistrations = (publicRegistrations ?? []) as PublicRegistrationRow[];

    const memberRegistrationIds = memberRegistrations.map((registration) => registration.id);
    const publicRegistrationIds = safePublicRegistrations.map((registration) => registration.id);

    const { data: memberAnswers, error: memberAnswerError } =
      memberRegistrationIds.length && safeFields.length
        ? await adminClient
            .from('attendance_answers')
            .select('registration_id, attendance_field_id, answer_text, answer_number')
            .in('registration_id', memberRegistrationIds)
            .in(
              'attendance_field_id',
              safeFields.map((field) => field.id),
            )
        : { data: [], error: null };

    if (memberAnswerError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read member attendance answers' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: publicAnswers, error: publicAnswerError } =
      publicRegistrationIds.length && safeFields.length
        ? await adminClient
            .from('public_attendance_answers')
            .select('public_registration_id, attendance_field_id, answer_text, answer_number')
            .in('public_registration_id', publicRegistrationIds)
            .in(
              'attendance_field_id',
              safeFields.map((field) => field.id),
            )
        : { data: [], error: null };

    if (publicAnswerError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to read public attendance answers' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const userById = new Map(((users ?? []) as UserRow[]).map((user) => [user.id, user]));

    const memberAnswersByTarget = new Map<string, Map<string, AttendanceAnswerRow>>();
    ((memberAnswers ?? []) as AttendanceAnswerRow[]).forEach((answer) => {
      const current = memberAnswersByTarget.get(answer.registration_id) ?? new Map();
      current.set(answer.attendance_field_id, answer);
      memberAnswersByTarget.set(answer.registration_id, current);
    });

    const publicAnswersByTarget = new Map<string, Map<string, PublicAttendanceAnswerRow>>();
    ((publicAnswers ?? []) as PublicAttendanceAnswerRow[]).forEach((answer) => {
      const current = publicAnswersByTarget.get(answer.public_registration_id) ?? new Map();
      current.set(answer.attendance_field_id, answer);
      publicAnswersByTarget.set(answer.public_registration_id, current);
    });

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
      ...safeFields.map((field) => field.field_key),
    ];

    const memberRows = memberRegistrations
      .map((registration) => {
        const user = userById.get(registration.user_id);
        if (!user) return null;

        const answersByField = memberAnswersByTarget.get(registration.id) ?? new Map();

        const answerCells = safeFields.map((field) => {
          const answer = answersByField.get(field.id);
          return formatAnswerValue(
            field.field_type,
            answer?.answer_text ?? null,
            answer?.answer_number ?? null,
          );
        });

        return [
          'registered',
          formatTimestampInTimeZone(registration.submitted_at, PH_TIME_ZONE, 'PHT'),
          registration.id,
          '',
          user.member_id ?? '',
          user.full_name,
          user.email ?? '',
          user.role ?? '',
          user.category ?? '',
          ...answerCells,
        ];
      })
      .filter((row): row is string[] => Array.isArray(row));

    const publicRows = safePublicRegistrations.map((registration) => {
      const fullName = `${registration.first_name ?? ''} ${registration.last_name ?? ''}`.trim();
      const answersByField = publicAnswersByTarget.get(registration.id) ?? new Map();

      const answerCells = safeFields.map((field) => {
        const answer = answersByField.get(field.id);
        return formatAnswerValue(
          field.field_type,
          answer?.answer_text ?? null,
          answer?.answer_number ?? null,
        );
      });

      return [
        'public',
        formatTimestampInTimeZone(registration.submitted_at, PH_TIME_ZONE, 'PHT'),
        '',
        registration.id,
        '',
        fullName || 'Guest Attendee',
        registration.email ?? '',
        '',
        '',
        ...answerCells,
      ];
    });

    const csvRows = [header, ...memberRows, ...publicRows]
      .map((row) => row.map(escapeCsvField).join(','))
      .join('\n');

    const eventTitle = eventData?.title ? sanitizeFilenamePart(String(eventData.title)) : 'event';
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
