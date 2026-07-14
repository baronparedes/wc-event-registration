import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const exportAttendanceRequestSchema = z.object({
  event_id: z.string().uuid('event_id must be a valid UUID'),
});

type ExportAttendanceRequest = z.infer<typeof exportAttendanceRequestSchema>;

type AttendanceFieldRow = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
};

type RegistrationRow = {
  id: string;
  user_id: string;
};

type PublicRegistrationRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type UserRow = {
  id: string;
  member_id: string | null;
  full_name: string | null;
  email: string | null;
};

type CheckInRow = {
  attendee_kind: 'registered' | 'public';
  registration_id: string | null;
  public_registration_id: string | null;
  first_checked_in_at: string;
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

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    text = '"' + text.replace(/"/g, '""') + '"';
  }

  return text;
}

function formatHeaderFromKey(fieldKey: string): string {
  return fieldKey
    .split('_')
    .map((part) => (part ? `${part.charAt(0).toUpperCase()}${part.slice(1)}` : part))
    .join(' ');
}

function sanitizeFilenamePart(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildUtcTimestampForFilename(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${min}${ss}`;
}

function formatAttendanceAnswerValue(
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
        return parsed.map((item) => String(item)).join('; ');
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
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join('; ');
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
    functionName: 'export-attendance-csv',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'export-attendance-csv',
      windowMs: RATE_LIMIT_PRESETS.attendanceCsvExport.windowMs,
      maxHits: RATE_LIMIT_PRESETS.attendanceCsvExport.maxHits,
    },
    schema: exportAttendanceRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { event_id }: ExportAttendanceRequest = guard.data;
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
        JSON.stringify({
          success: false,
          error: 'Failed to read attendance settings',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if (!settingsData?.attendance_enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Attendance tracking is disabled for this event',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: fields, error: fieldError } = await adminClient
      .from('attendance_fields')
      .select('id, field_key, label, field_type')
      .eq('event_id', event_id)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (fieldError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to read attendance fields',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const safeFields = (fields ?? []) as AttendanceFieldRow[];

    const { data: registrations, error: registrationError } = await adminClient
      .from('registrations')
      .select('id, user_id')
      .eq('event_id', event_id)
      .in('status', ['submitted', 'updated']);

    if (registrationError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to read registrations',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const memberRegistrations = (registrations ?? []) as RegistrationRow[];
    const memberUserIds = memberRegistrations
      .map((registration) => registration.user_id)
      .filter((value) => Boolean(value));

    const { data: users, error: userError } = memberUserIds.length
      ? await adminClient
          .from('users')
          .select('id, member_id, full_name, email')
          .in('id', memberUserIds)
      : { data: [], error: null };

    if (userError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to read users',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: publicRegistrations, error: publicRegistrationError } = await adminClient
      .from('public_registrations')
      .select('id, first_name, last_name, email')
      .eq('event_id', event_id)
      .in('status', ['submitted', 'updated']);

    if (publicRegistrationError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to read public registrations',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const safePublicRegistrations = (publicRegistrations ?? []) as PublicRegistrationRow[];

    const { data: checkIns, error: checkInError } = await adminClient
      .from('attendance_check_ins')
      .select('attendee_kind, registration_id, public_registration_id, first_checked_in_at')
      .eq('event_id', event_id);

    if (checkInError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to read attendance check-ins',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const memberRegistrationIds = memberRegistrations.map((registration) => registration.id);
    const publicRegistrationIds = safePublicRegistrations.map((registration) => registration.id);

    const { data: memberAnswers, error: memberAnswerError } =
      memberRegistrationIds.length > 0 && safeFields.length > 0
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
        JSON.stringify({
          success: false,
          error: 'Failed to read attendance answers',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: publicAnswers, error: publicAnswerError } =
      publicRegistrationIds.length > 0 && safeFields.length > 0
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
        JSON.stringify({
          success: false,
          error: 'Failed to read public attendance answers',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const userById = new Map(((users ?? []) as UserRow[]).map((user) => [user.id, user]));

    const memberCheckInByRegistrationId = new Map<string, CheckInRow>();
    const publicCheckInByRegistrationId = new Map<string, CheckInRow>();

    ((checkIns ?? []) as CheckInRow[]).forEach((row) => {
      if (row.attendee_kind === 'registered' && row.registration_id) {
        memberCheckInByRegistrationId.set(row.registration_id, row);
        return;
      }

      if (row.attendee_kind === 'public' && row.public_registration_id) {
        publicCheckInByRegistrationId.set(row.public_registration_id, row);
      }
    });

    const memberAnswersByRegistration = new Map<string, Map<string, AttendanceAnswerRow>>();
    ((memberAnswers ?? []) as AttendanceAnswerRow[]).forEach((answer) => {
      const current = memberAnswersByRegistration.get(answer.registration_id) ?? new Map();
      current.set(answer.attendance_field_id, answer);
      memberAnswersByRegistration.set(answer.registration_id, current);
    });

    const publicAnswersByRegistration = new Map<string, Map<string, PublicAttendanceAnswerRow>>();
    ((publicAnswers ?? []) as PublicAttendanceAnswerRow[]).forEach((answer) => {
      const current = publicAnswersByRegistration.get(answer.public_registration_id) ?? new Map();
      current.set(answer.attendance_field_id, answer);
      publicAnswersByRegistration.set(answer.public_registration_id, current);
    });

    const header = [
      'attendee_kind',
      'registration_id',
      'public_registration_id',
      'member_id',
      'full_name',
      'email',
      'status',
      'official_check_in_time',
      ...safeFields.map((field) => field.label || formatHeaderFromKey(field.field_key)),
    ];

    const memberRows = memberRegistrations
      .map((registration) => {
        const user = userById.get(registration.user_id);
        if (!user) {
          return null;
        }

        const checkIn = memberCheckInByRegistrationId.get(registration.id);
        const answersByField = memberAnswersByRegistration.get(registration.id) ?? new Map();

        const answerCells = safeFields.map((field) => {
          const answer = answersByField.get(field.id);
          return formatAttendanceAnswerValue(
            field.field_type,
            answer?.answer_text ?? null,
            answer?.answer_number ?? null,
          );
        });

        return [
          'registered',
          registration.id,
          '',
          user.member_id ?? '',
          user.full_name ?? '',
          user.email ?? '',
          checkIn ? 'checked_in' : 'not_checked_in',
          checkIn?.first_checked_in_at ?? '',
          ...answerCells,
        ];
      })
      .filter((row): row is string[] => Array.isArray(row));

    const publicRows = safePublicRegistrations.map((registration) => {
      const checkIn = publicCheckInByRegistrationId.get(registration.id);
      const answersByField = publicAnswersByRegistration.get(registration.id) ?? new Map();
      const fullName = `${registration.first_name ?? ''} ${registration.last_name ?? ''}`.trim();

      const answerCells = safeFields.map((field) => {
        const answer = answersByField.get(field.id);
        return formatAttendanceAnswerValue(
          field.field_type,
          answer?.answer_text ?? null,
          answer?.answer_number ?? null,
        );
      });

      return [
        'public',
        '',
        registration.id,
        '',
        fullName || 'Guest Attendee',
        registration.email ?? '',
        checkIn ? 'checked_in' : 'not_checked_in',
        checkIn?.first_checked_in_at ?? '',
        ...answerCells,
      ];
    });

    const csvContent = [header, ...memberRows, ...publicRows]
      .map((row) => row.map((value) => escapeCsvField(value)).join(','))
      .join('\n');

    const eventName = sanitizeFilenamePart(String(eventData?.title ?? ''));
    const fallbackEventName = sanitizeFilenamePart(event_id);
    const timestamp = buildUtcTimestampForFilename(new Date());
    const filenamePrefix = eventName || `event-${fallbackEventName}`;
    const filename = `${filenamePrefix}-attendance-${timestamp}.csv`;

    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
