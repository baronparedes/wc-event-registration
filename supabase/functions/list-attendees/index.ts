import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const listAttendeesRequestSchema = z.object({
  event_id: z.string().uuid('Invalid event ID.'),
});

type ListAttendeesRequest = z.infer<typeof listAttendeesRequestSchema>;

type AttendanceSettingsRow = {
  attendance_enabled: boolean;
};

type UserRow = {
  id: string;
  member_id: string | null;
  last_name: string | null;
  full_name: string;
  email: string | null;
  role: string | null;
  category: string | null;
  nickname: string | null;
};

type RegistrationRow = {
  id: string;
  user_id: string;
  status: 'submitted' | 'updated' | 'cancelled';
  submitted_at: string;
  users: UserRow;
};

type PublicRegistrationRow = {
  id: string;
  first_name: string;
  last_name: string;
  nickname: string | null;
  email: string | null;
  status: 'submitted' | 'updated' | 'cancelled';
  submitted_at: string;
};

type CheckInRow = {
  registration_id: string | null;
  public_registration_id?: string | null;
  first_checked_in_at: string;
};

type AttendanceAnswerRow = {
  registration_id: string;
  attendance_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  attendance_fields: {
    id: string;
    field_type: string;
    field_key: string;
    label: string;
    display_order: number;
  };
};

type PublicAttendanceAnswerRow = {
  public_registration_id: string;
  attendance_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  attendance_fields: {
    id: string;
    field_type: string;
    field_key: string;
    label: string;
    display_order: number;
  };
};

type AnswerSummarySource = {
  attendance_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  attendance_fields: {
    id: string;
    field_type: string;
    field_key: string;
    label: string;
    display_order: number;
  };
};

type RegistrationAnswerRow = {
  registration_id: string;
  event_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown;
  event_fields: {
    id: string;
    field_type: string;
    field_key: string;
    label: string;
    display_order: number;
  };
};

type PublicRegistrationAnswerRow = {
  public_registration_id: string;
  event_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown;
  event_fields: {
    id: string;
    field_type: string;
    field_key: string;
    label: string;
    display_order: number;
  };
};

function normalizeAnswerValue(answer: {
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown;
}): { answer_text: string | null; answer_number: number | null } {
  if (answer.answer_text !== null) {
    return { answer_text: answer.answer_text, answer_number: null };
  }
  if (answer.answer_number !== null) {
    return { answer_text: null, answer_number: answer.answer_number };
  }
  if (answer.answer_boolean !== null) {
    return { answer_text: String(answer.answer_boolean), answer_number: null };
  }
  if (answer.answer_date !== null) {
    return { answer_text: answer.answer_date, answer_number: null };
  }
  if (answer.answer_json !== null && answer.answer_json !== undefined) {
    return { answer_text: JSON.stringify(answer.answer_json), answer_number: null };
  }
  return { answer_text: null, answer_number: null };
}

function readOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildPublicFullName(registration: PublicRegistrationRow): string {
  return `${registration.first_name} ${registration.last_name}`.trim();
}

function isMissingPublicRegistrationColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message =
    'message' in error && typeof (error as { message?: unknown }).message === 'string'
      ? (error as { message: string }).message
      : '';
  const code =
    'code' in error && typeof (error as { code?: unknown }).code === 'string'
      ? (error as { code: string }).code
      : '';
  return code === '42703' || message.toLowerCase().includes('public_registration_id');
}

function logListAttendeesError(stage: string, error: unknown, context?: Record<string, unknown>) {
  console.error('[list-attendees] error', {
    stage,
    error,
    ...(context ?? {}),
  });
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'list-attendees',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'list-attendees',
      windowMs: RATE_LIMIT_PRESETS.listAttendees.windowMs,
      maxHits: RATE_LIMIT_PRESETS.listAttendees.maxHits,
    },
    schema: listAttendeesRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { event_id }: ListAttendeesRequest = guard.data;
    const adminClient = guard.client;

    const { data: settings, error: settingsError } = await adminClient
      .from('attendance_settings')
      .select('attendance_enabled')
      .eq('event_id', event_id)
      .maybeSingle();

    const settingsRow = settings as AttendanceSettingsRow | null;

    if (settingsError) {
      logListAttendeesError('load_attendance_settings', settingsError, { event_id });
      return errorResponse(corsHeaders, 500, 'Failed to load attendance settings', undefined, {
        error_code: 'SETTINGS_LOOKUP_FAILED',
      });
    }

    if (!settingsRow?.attendance_enabled) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Attendance tracking is disabled for this event.',
          error_code: 'ATTENDANCE_DISABLED',
        },
        400,
      );
    }

    const [registrationsResult, publicRegistrationsResult] = await Promise.all([
      adminClient
        .from('registrations')
        .select(
          'id, user_id, status, submitted_at, users!inner(id, member_id, last_name, full_name, email, role, category, nickname)',
        )
        .eq('event_id', event_id)
        .neq('status', 'cancelled')
        .limit(10000),

      adminClient
        .from('public_registrations')
        .select('id, first_name, last_name, nickname, email, status, submitted_at')
        .eq('event_id', event_id)
        .neq('status', 'cancelled')
        .limit(10000),
    ]);

    if (registrationsResult.error || publicRegistrationsResult.error) {
      logListAttendeesError(
        'fetch_registrations',
        {
          registrationsError: registrationsResult.error,
          publicRegistrationsError: publicRegistrationsResult.error,
        },
        {
          event_id,
        },
      );
      return errorResponse(corsHeaders, 500, 'Failed to fetch registrations', undefined, {
        error_code: 'REGISTRATION_FETCH_FAILED',
      });
    }

    const registrationRows = (registrationsResult.data ?? []) as RegistrationRow[];
    const publicRegistrationRows = (publicRegistrationsResult.data ??
      []) as PublicRegistrationRow[];

    const registrationIds = registrationRows.map((r) => r.id);
    const publicRegistrationIds = publicRegistrationRows.map((r) => r.id);
    const registeredIdSet = new Set(registrationIds);
    const publicIdSet = new Set(publicRegistrationIds);
    const allRegistrationRefIds = Array.from(
      new Set([...registrationIds, ...publicRegistrationIds]),
    );

    const checkInsQuery =
      allRegistrationRefIds.length > 0
        ? adminClient
            .from('attendance_check_ins')
            .select('registration_id, first_checked_in_at')
            .eq('event_id', event_id)
            .in('registration_id', allRegistrationRefIds)
        : Promise.resolve({ data: [], error: null });

    const publicCheckInsQuery =
      publicRegistrationIds.length > 0
        ? adminClient
            .from('attendance_check_ins')
            .select('public_registration_id, first_checked_in_at')
            .eq('event_id', event_id)
            .in('public_registration_id', publicRegistrationIds)
        : Promise.resolve({ data: [], error: null });

    const attendanceAnswersQuery =
      registrationIds.length > 0
        ? adminClient
            .from('attendance_answers')
            .select(
              'registration_id, attendance_field_id, answer_text, answer_number, attendance_fields!inner(id, field_type, field_key, label, display_order)',
            )
            .in('registration_id', registrationIds)
        : Promise.resolve({ data: [], error: null });

    const publicAttendanceAnswersQuery =
      publicRegistrationIds.length > 0
        ? adminClient
            .from('public_attendance_answers')
            .select(
              'public_registration_id, attendance_field_id, answer_text, answer_number, attendance_fields!inner(id, field_type, field_key, label, display_order)',
            )
            .in('public_registration_id', publicRegistrationIds)
        : Promise.resolve({ data: [], error: null });

    const registrationAnswersQuery =
      registrationIds.length > 0
        ? adminClient
            .from('registration_answers')
            .select(
              'registration_id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json, event_fields!inner(id, field_type, field_key, label, display_order)',
            )
            .in('registration_id', registrationIds)
        : Promise.resolve({ data: [], error: null });

    const publicRegistrationAnswersQuery =
      publicRegistrationIds.length > 0
        ? adminClient
            .from('public_registration_answers')
            .select(
              'public_registration_id, event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json, event_fields!inner(id, field_type, field_key, label, display_order)',
            )
            .in('public_registration_id', publicRegistrationIds)
        : Promise.resolve({ data: [], error: null });

    const [
      checkInsResult,
      publicCheckInsResult,
      attendanceAnswersResult,
      publicAttendanceAnswersResult,
      registrationAnswersResult,
      publicRegistrationAnswersResult,
    ] = await Promise.all([
      checkInsQuery,
      publicCheckInsQuery,
      attendanceAnswersQuery,
      publicAttendanceAnswersQuery,
      registrationAnswersQuery,
      publicRegistrationAnswersQuery,
    ]);

    const publicCheckInLookupError =
      publicCheckInsResult.error &&
      !isMissingPublicRegistrationColumnError(publicCheckInsResult.error)
        ? publicCheckInsResult.error
        : null;

    if (
      checkInsResult.error ||
      publicCheckInLookupError ||
      attendanceAnswersResult.error ||
      publicAttendanceAnswersResult.error ||
      registrationAnswersResult.error ||
      publicRegistrationAnswersResult.error
    ) {
      logListAttendeesError(
        'load_attendee_details',
        {
          checkInsError: checkInsResult.error,
          publicCheckInsError: publicCheckInsResult.error,
          publicCheckInLookupError,
          attendanceAnswersError: attendanceAnswersResult.error,
          publicAttendanceAnswersError: publicAttendanceAnswersResult.error,
          registrationAnswersError: registrationAnswersResult.error,
          publicRegistrationAnswersError: publicRegistrationAnswersResult.error,
        },
        {
          event_id,
          registration_count: registrationIds.length,
          public_registration_count: publicRegistrationIds.length,
        },
      );
      return errorResponse(corsHeaders, 500, 'Failed to load attendee details', undefined, {
        error_code: 'ATTENDEE_DETAILS_LOOKUP_FAILED',
      });
    }

    const checkIns = (checkInsResult.data ?? []) as CheckInRow[];
    const publicCheckIns =
      publicCheckInsResult.error &&
      isMissingPublicRegistrationColumnError(publicCheckInsResult.error)
        ? ([] as CheckInRow[])
        : ((publicCheckInsResult.data ?? []) as CheckInRow[]);
    const attendanceAnswers = (attendanceAnswersResult.data ?? []) as AttendanceAnswerRow[];
    const publicAttendanceAnswers = (publicAttendanceAnswersResult.data ??
      []) as PublicAttendanceAnswerRow[];
    const registrationAnswers = (registrationAnswersResult.data ?? []) as RegistrationAnswerRow[];
    const publicRegistrationAnswers = (publicRegistrationAnswersResult.data ??
      []) as PublicRegistrationAnswerRow[];

    const checkInByAttendeeRef = new Map<string, string>();
    for (const checkIn of checkIns) {
      if (checkIn.registration_id && registeredIdSet.has(checkIn.registration_id)) {
        checkInByAttendeeRef.set(
          `registered:${checkIn.registration_id}`,
          checkIn.first_checked_in_at,
        );
      }
      if (checkIn.registration_id && publicIdSet.has(checkIn.registration_id)) {
        checkInByAttendeeRef.set(`public:${checkIn.registration_id}`, checkIn.first_checked_in_at);
      }
    }
    for (const checkIn of publicCheckIns) {
      if (checkIn.public_registration_id && publicIdSet.has(checkIn.public_registration_id)) {
        checkInByAttendeeRef.set(
          `public:${checkIn.public_registration_id}`,
          checkIn.first_checked_in_at,
        );
      }
    }

    const attendanceAnswersByAttendeeRef = new Map<string, AnswerSummarySource[]>();
    for (const answer of attendanceAnswers) {
      const current =
        attendanceAnswersByAttendeeRef.get(`registered:${answer.registration_id}`) ?? [];
      current.push(answer);
      attendanceAnswersByAttendeeRef.set(`registered:${answer.registration_id}`, current);
    }
    for (const answer of publicAttendanceAnswers) {
      const current =
        attendanceAnswersByAttendeeRef.get(`public:${answer.public_registration_id}`) ?? [];
      current.push(answer);
      attendanceAnswersByAttendeeRef.set(`public:${answer.public_registration_id}`, current);
    }

    const registrationAnswersByRegistrationId = new Map<string, RegistrationAnswerRow[]>();
    for (const answer of registrationAnswers) {
      const current = registrationAnswersByRegistrationId.get(answer.registration_id) ?? [];
      current.push(answer);
      registrationAnswersByRegistrationId.set(answer.registration_id, current);
    }

    const publicRegistrationAnswersByRegistrationId = new Map<
      string,
      PublicRegistrationAnswerRow[]
    >();
    for (const answer of publicRegistrationAnswers) {
      const current =
        publicRegistrationAnswersByRegistrationId.get(answer.public_registration_id) ?? [];
      current.push(answer);
      publicRegistrationAnswersByRegistrationId.set(answer.public_registration_id, current);
    }

    const registeredResults = registrationRows.map((registration) => {
      const user = registration.users;
      const checkInTime = checkInByAttendeeRef.get(`registered:${registration.id}`) ?? null;

      const attendanceAnswerSummaries = (
        attendanceAnswersByAttendeeRef.get(`registered:${registration.id}`) ?? []
      )
        .sort((a, b) => a.attendance_fields.display_order - b.attendance_fields.display_order)
        .map((answer) => ({
          attendance_field_id: answer.attendance_field_id,
          field_type: answer.attendance_fields.field_type,
          field_key: answer.attendance_fields.field_key,
          label: answer.attendance_fields.label,
          answer_text: answer.answer_text,
          answer_number: answer.answer_number,
        }));

      const registrationAnswerSummaries = (
        registrationAnswersByRegistrationId.get(registration.id) ?? []
      )
        .sort((a, b) => a.event_fields.display_order - b.event_fields.display_order)
        .map((answer) => {
          const normalized = normalizeAnswerValue(answer);
          return {
            event_field_id: answer.event_field_id,
            field_type: answer.event_fields.field_type,
            field_key: answer.event_fields.field_key,
            label: answer.event_fields.label,
            answer_text: normalized.answer_text,
            answer_number: normalized.answer_number,
          };
        });

      return {
        attendee_kind: 'registered',
        registration_id: registration.id,
        public_registration_id: null,
        user_id: registration.user_id,
        member_id: user.member_id,
        full_name: user.full_name,
        email: user.email,
        role: readOptionalText(user.role),
        category: readOptionalText(user.category),
        registration_status: registration.status,
        submitted_at: registration.submitted_at,
        check_in_status: checkInTime ? 'checked_in' : 'not_checked_in',
        official_check_in_time: checkInTime,
        registration_answers: registrationAnswerSummaries,
        attendance_answers: attendanceAnswerSummaries,
      };
    });

    const publicResults = publicRegistrationRows.map((registration) => {
      const checkInTime = checkInByAttendeeRef.get(`public:${registration.id}`) ?? null;

      const attendanceAnswerSummaries = (
        attendanceAnswersByAttendeeRef.get(`public:${registration.id}`) ?? []
      )
        .sort((a, b) => a.attendance_fields.display_order - b.attendance_fields.display_order)
        .map((answer) => ({
          attendance_field_id: answer.attendance_field_id,
          field_type: answer.attendance_fields.field_type,
          field_key: answer.attendance_fields.field_key,
          label: answer.attendance_fields.label,
          answer_text: answer.answer_text,
          answer_number: answer.answer_number,
        }));

      const registrationAnswerSummaries = (
        publicRegistrationAnswersByRegistrationId.get(registration.id) ?? []
      )
        .sort((a, b) => a.event_fields.display_order - b.event_fields.display_order)
        .map((answer) => {
          const normalized = normalizeAnswerValue(answer);
          return {
            event_field_id: answer.event_field_id,
            field_type: answer.event_fields.field_type,
            field_key: answer.event_fields.field_key,
            label: answer.event_fields.label,
            answer_text: normalized.answer_text,
            answer_number: normalized.answer_number,
          };
        });

      return {
        attendee_kind: 'public',
        registration_id: registration.id,
        public_registration_id: registration.id,
        user_id: null,
        member_id: 'Guest',
        full_name: buildPublicFullName(registration),
        email: registration.email,
        role: null,
        category: null,
        registration_status: registration.status,
        submitted_at: registration.submitted_at,
        check_in_status: checkInTime ? 'checked_in' : 'not_checked_in',
        official_check_in_time: checkInTime,
        registration_answers: registrationAnswerSummaries,
        attendance_answers: attendanceAnswerSummaries,
      };
    });

    const results = [...registeredResults, ...publicResults].sort((a, b) =>
      a.full_name.localeCompare(b.full_name),
    );

    return jsonResponse(corsHeaders, { success: true, results }, 200);
  } catch (error) {
    logListAttendeesError('unhandled_exception', error);
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
