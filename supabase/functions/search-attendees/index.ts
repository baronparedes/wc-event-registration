import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const searchAttendeesRequestSchema = z.object({
  event_id: z.string().uuid('Invalid event ID.'),
  search_token: z.string().trim().min(1, 'Search token is required.').max(120),
});

type SearchAttendeesRequest = z.infer<typeof searchAttendeesRequestSchema>;

type UserSearchRow = {
  id: string;
  member_id: string | null;
  last_name: string | null;
  full_name: string;
  email: string | null;
  role: string | null;
  category: string | null;
  nickname: string | null;
};

type RegistrationSearchRow = {
  id: string;
  user_id: string;
  status: 'submitted' | 'updated' | 'cancelled';
  submitted_at: string;
  users: UserSearchRow;
};

type PublicRegistrationSearchRow = {
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

function uniqueById<T extends { id: string }>(rows: T[]): T[] {
  const byId = new Map<string, T>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

function normalizeAnswerValue(answer: {
  answer_text: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_date: string | null;
  answer_json: unknown;
}): {
  answer_text: string | null;
  answer_number: number | null;
} {
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
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

function buildPublicRegistrationFullName(registration: PublicRegistrationSearchRow): string {
  return `${registration.first_name} ${registration.last_name}`.trim();
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function matchesNicknameLastNameAggregate(
  registration: PublicRegistrationSearchRow,
  normalizedToken: string,
): boolean {
  if (!registration.nickname) {
    return false;
  }

  const nickname = normalizeSearchText(registration.nickname);
  const lastName = normalizeSearchText(registration.last_name);
  const aggregate = normalizeSearchText(`${registration.nickname} ${registration.last_name}`);

  if (aggregate.includes(normalizedToken)) {
    return true;
  }

  const tokenParts = normalizedToken.split(' ').filter(Boolean);
  if (tokenParts.length < 2) {
    return false;
  }

  const [firstPart, ...remainingParts] = tokenParts;
  if (!nickname.includes(firstPart)) {
    return false;
  }

  // Allow partial tail-token matching in the last name so combined searches still resolve
  // when users type incomplete or slightly off trailing terms.
  return remainingParts.some((part) => lastName.includes(part));
}

function matchesUserNicknameLastNameAggregate(
  user: UserSearchRow,
  normalizedToken: string,
): boolean {
  const nickname = normalizeSearchText(user.nickname ?? '');
  if (!nickname) {
    return false;
  }

  const lastName = normalizeSearchText(user.last_name ?? '');
  const aggregate = normalizeSearchText(`${nickname} ${lastName}`);

  if (aggregate.includes(normalizedToken)) {
    return true;
  }

  const tokenParts = normalizedToken.split(' ').filter(Boolean);
  if (tokenParts.length < 2) {
    return false;
  }

  const [firstPart, ...remainingParts] = tokenParts;
  if (!nickname.includes(firstPart)) {
    return false;
  }

  return remainingParts.some((part) => lastName.includes(part));
}

function matchesDirectUserSearch(user: UserSearchRow, normalizedToken: string): boolean {
  const memberId = normalizeSearchText(user.member_id ?? '');
  const fullName = normalizeSearchText(user.full_name);
  const lastName = normalizeSearchText(user.last_name ?? '');
  const email = normalizeSearchText(user.email ?? '');

  return (
    memberId.includes(normalizedToken) ||
    fullName.includes(normalizedToken) ||
    lastName.includes(normalizedToken) ||
    email.includes(normalizedToken)
  );
}

function isMissingPublicRegistrationColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

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

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'search-attendees',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'search-attendees',
      windowMs: RATE_LIMIT_PRESETS.searchAttendees.windowMs,
      maxHits: RATE_LIMIT_PRESETS.searchAttendees.maxHits,
    },
    schema: searchAttendeesRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const { event_id, search_token }: SearchAttendeesRequest = guard.data;
    const adminClient = guard.client;

    const { data: settings, error: settingsError } = await adminClient
      .from('attendance_settings')
      .select('attendance_enabled')
      .eq('event_id', event_id)
      .maybeSingle();

    if (settingsError) {
      return errorResponse(corsHeaders, 500, 'Failed to load attendance settings', undefined, {
        error_code: 'SETTINGS_LOOKUP_FAILED',
      });
    }

    if (!settings?.attendance_enabled) {
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

    const normalizedToken = search_token.trim();
    const normalizedTokenForAggregate = normalizeSearchText(search_token);
    const tokenPattern = `%${normalizedToken}%`;
    const aggregateSeedToken = normalizedTokenForAggregate.split(' ').find(Boolean) ?? '';

    const registrationsQuery = adminClient
      .from('registrations')
      .select(
        'id, user_id, status, submitted_at, users!inner(id, member_id, last_name, full_name, email, role, category, nickname)',
      )
      .eq('event_id', event_id)
      .neq('status', 'cancelled')
      .or(
        normalizedTokenForAggregate.includes(' ')
          ? `member_id.ilike.${tokenPattern},full_name.ilike.${tokenPattern},last_name.ilike.${tokenPattern},email.ilike.${tokenPattern},full_name.ilike.%${aggregateSeedToken}%,last_name.ilike.%${aggregateSeedToken}%`
          : `member_id.ilike.${tokenPattern},full_name.ilike.${tokenPattern},last_name.ilike.${tokenPattern},email.ilike.${tokenPattern}`,
        { foreignTable: 'users' },
      )
      .limit(100);

    const publicSearchResult = await adminClient
      .from('public_registrations')
      .select('id, first_name, last_name, nickname, email, status, submitted_at')
      .eq('event_id', event_id)
      .neq('status', 'cancelled')
      .or(
        normalizedTokenForAggregate.includes(' ')
          ? `first_name.ilike.${tokenPattern},last_name.ilike.${tokenPattern},nickname.ilike.${tokenPattern},email.ilike.${tokenPattern},nickname.ilike.%${aggregateSeedToken}%,last_name.ilike.%${aggregateSeedToken}%`
          : `first_name.ilike.${tokenPattern},last_name.ilike.${tokenPattern},nickname.ilike.${tokenPattern},email.ilike.${tokenPattern}`,
      )
      .limit(100);

    const [registrationsResult, publicSearchQueryResult] = await Promise.all([
      registrationsQuery,
      publicSearchResult,
    ]);

    if (registrationsResult.error || publicSearchQueryResult.error) {
      return errorResponse(corsHeaders, 500, 'Failed to search registrations', undefined, {
        error_code: 'REGISTRATION_SEARCH_FAILED',
      });
    }

    const registrationRows = (registrationsResult.data ?? []) as RegistrationSearchRow[];
    const filteredRegistrationRows = registrationRows.filter((registration) => {
      const user = registration.users;
      return (
        matchesDirectUserSearch(user, normalizedTokenForAggregate) ||
        matchesUserNicknameLastNameAggregate(user, normalizedTokenForAggregate)
      );
    });
    const publicSearchRows = (publicSearchQueryResult.data ?? []) as PublicRegistrationSearchRow[];
    const nicknameAggregateRows = publicSearchRows.filter((registration) =>
      matchesNicknameLastNameAggregate(registration, normalizedTokenForAggregate),
    );
    const publicRegistrationRows = uniqueById([...publicSearchRows, ...nicknameAggregateRows]);

    if (filteredRegistrationRows.length === 0 && publicRegistrationRows.length === 0) {
      return jsonResponse(
        corsHeaders,
        {
          success: true,
          results: [],
        },
        200,
      );
    }

    const registrationIds = filteredRegistrationRows.map((registration) => registration.id);
    const publicRegistrationIds = publicRegistrationRows.map((registration) => registration.id);
    const allRegistrationRefIds = Array.from(
      new Set([...registrationIds, ...publicRegistrationIds]),
    );
    const registeredIdSet = new Set(registrationIds);
    const publicIdSet = new Set(publicRegistrationIds);

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

    const registeredResults = filteredRegistrationRows
      .map((registration) => {
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
            const normalizedAnswer = normalizeAnswerValue(answer);

            return {
              event_field_id: answer.event_field_id,
              field_type: answer.event_fields.field_type,
              field_key: answer.event_fields.field_key,
              label: answer.event_fields.label,
              answer_text: normalizedAnswer.answer_text,
              answer_number: normalizedAnswer.answer_number,
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
      })
      .filter(Boolean);

    const publicResults = publicRegistrationRows.map((registration) => {
      const checkInTime = checkInByAttendeeRef.get(`public:${registration.id}`) ?? null;
      const registrationAnswerSummaries = (
        publicRegistrationAnswersByRegistrationId.get(registration.id) ?? []
      )
        .sort((a, b) => a.event_fields.display_order - b.event_fields.display_order)
        .map((answer) => {
          const normalizedAnswer = normalizeAnswerValue(answer);

          return {
            event_field_id: answer.event_field_id,
            field_type: answer.event_fields.field_type,
            field_key: answer.event_fields.field_key,
            label: answer.event_fields.label,
            answer_text: normalizedAnswer.answer_text,
            answer_number: normalizedAnswer.answer_number,
          };
        });
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

      return {
        attendee_kind: 'public',
        registration_id: registration.id,
        public_registration_id: registration.id,
        user_id: null,
        member_id: 'Guest',
        full_name: buildPublicRegistrationFullName(registration),
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

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        results,
      },
      200,
    );
  } catch (error) {
    console.error('[search-attendees] unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
