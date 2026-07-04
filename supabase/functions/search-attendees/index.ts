import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import { errorResponse, jsonResponse } from '@/shared/http.ts';
import {
  buildCorsHeaders,
  createObscuredDenyResponse,
  isOriginAllowed,
  readAllowedOrigins,
  requireAdminAccess,
} from '@/shared/security.ts';
import { parseFunctionEnvironment, parseRequestBody, z } from '@/shared/validation.ts';

const allowedOrigins = readAllowedOrigins();

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
  metadata: Record<string, unknown> | null;
};

type RegistrationSearchRow = {
  id: string;
  user_id: string;
  status: 'submitted' | 'updated' | 'cancelled';
  submitted_at: string;
};

type CheckInRow = {
  registration_id: string;
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

type RegistrationAnswerRow = {
  registration_id: string;
  event_field_id: string;
  answer_text: string | null;
  answer_number: number | null;
  event_fields: {
    id: string;
    field_type: string;
    field_key: string;
    label: string;
    display_order: number;
  };
};

function uniqueUsers(rows: UserSearchRow[]): UserSearchRow[] {
  const byId = new Map<string, UserSearchRow>();
  for (const row of rows) {
    byId.set(row.id, row);
  }
  return Array.from(byId.values());
}

function readMetadataText(metadata: Record<string, unknown> | null, key: string): string | null {
  const value = metadata?.[key];
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  const origin = req.headers.get('origin');
  const corsHeaders = buildCorsHeaders(origin, allowedOrigins);

  if (req.method === 'OPTIONS') {
    if (!isOriginAllowed(origin, allowedOrigins)) {
      return createObscuredDenyResponse(corsHeaders);
    }

    return new Response('ok', { headers: corsHeaders });
  }

  if (!isOriginAllowed(origin, allowedOrigins)) {
    return createObscuredDenyResponse(corsHeaders);
  }

  if (req.method !== 'POST') {
    return jsonResponse(corsHeaders, { success: false, error: 'Method not allowed' }, 405);
  }

  try {
    const env = parseFunctionEnvironment();
    const authHeader = req.headers.get('authorization');

    if (!env) {
      return errorResponse(corsHeaders, 500, 'Environment not configured');
    }

    const { supabaseUrl, supabaseServiceKey } = env;

    const adminAccess = await requireAdminAccess({
      requestId,
      logPrefix: 'search-attendees',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'search-attendees',
        windowMs: 60_000,
        maxHits: 120,
      },
    });

    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const parsedBody = await parseRequestBody(req, searchAttendeesRequestSchema);
    if (!parsedBody.success) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: parsedBody.error,
          detail: parsedBody.details,
          error_code: 'INVALID_REQUEST',
        },
        400,
      );
    }

    const { event_id, search_token }: SearchAttendeesRequest = parsedBody.data;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

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
    const tokenPattern = `%${normalizedToken}%`;

    const [memberMatch, nameMatch, lastNameMatch, emailMatch] = await Promise.all([
      adminClient
        .from('users')
        .select('id, member_id, last_name, full_name, email, metadata')
        .ilike('member_id', tokenPattern)
        .limit(25),
      adminClient
        .from('users')
        .select('id, member_id, last_name, full_name, email, metadata')
        .ilike('full_name', tokenPattern)
        .limit(25),
      adminClient
        .from('users')
        .select('id, member_id, last_name, full_name, email, metadata')
        .ilike('last_name', tokenPattern)
        .limit(25),
      adminClient
        .from('users')
        .select('id, member_id, last_name, full_name, email, metadata')
        .ilike('email', tokenPattern)
        .limit(25),
    ]);

    if (memberMatch.error || nameMatch.error || lastNameMatch.error || emailMatch.error) {
      return errorResponse(corsHeaders, 500, 'Failed to search users', undefined, {
        error_code: 'USER_SEARCH_FAILED',
      });
    }

    const matchingUsers = uniqueUsers([
      ...((memberMatch.data ?? []) as UserSearchRow[]),
      ...((nameMatch.data ?? []) as UserSearchRow[]),
      ...((lastNameMatch.data ?? []) as UserSearchRow[]),
      ...((emailMatch.data ?? []) as UserSearchRow[]),
    ]);

    if (matchingUsers.length === 0) {
      return jsonResponse(
        corsHeaders,
        {
          success: true,
          results: [],
        },
        200,
      );
    }

    const userIds = matchingUsers.map((user) => user.id);

    const { data: registrations, error: registrationsError } = await adminClient
      .from('registrations')
      .select('id, user_id, status, submitted_at')
      .eq('event_id', event_id)
      .in('user_id', userIds)
      .neq('status', 'cancelled')
      .limit(100);

    if (registrationsError) {
      return errorResponse(corsHeaders, 500, 'Failed to search registrations', undefined, {
        error_code: 'REGISTRATION_SEARCH_FAILED',
      });
    }

    const registrationRows = (registrations ?? []) as RegistrationSearchRow[];
    if (registrationRows.length === 0) {
      return jsonResponse(
        corsHeaders,
        {
          success: true,
          results: [],
        },
        200,
      );
    }

    const registrationIds = registrationRows.map((registration) => registration.id);

    const [checkInsResult, attendanceAnswersResult, registrationAnswersResult] = await Promise.all([
      adminClient
        .from('attendance_check_ins')
        .select('registration_id, first_checked_in_at')
        .eq('event_id', event_id)
        .in('registration_id', registrationIds),
      adminClient
        .from('attendance_answers')
        .select(
          'registration_id, attendance_field_id, answer_text, answer_number, attendance_fields!inner(id, field_type, field_key, label, display_order)',
        )
        .in('registration_id', registrationIds),
      adminClient
        .from('registration_answers')
        .select(
          'registration_id, event_field_id, answer_text, answer_number, event_fields!inner(id, field_type, field_key, label, display_order)',
        )
        .in('registration_id', registrationIds),
    ]);

    if (checkInsResult.error || attendanceAnswersResult.error || registrationAnswersResult.error) {
      return errorResponse(corsHeaders, 500, 'Failed to load attendee details', undefined, {
        error_code: 'ATTENDEE_DETAILS_LOOKUP_FAILED',
      });
    }

    const checkIns = (checkInsResult.data ?? []) as CheckInRow[];
    const attendanceAnswers = (attendanceAnswersResult.data ?? []) as AttendanceAnswerRow[];
    const registrationAnswers = (registrationAnswersResult.data ?? []) as RegistrationAnswerRow[];

    const userById = new Map(matchingUsers.map((user) => [user.id, user]));
    const checkInByRegistrationId = new Map(
      checkIns.map((checkIn) => [checkIn.registration_id, checkIn.first_checked_in_at]),
    );

    const attendanceAnswersByRegistrationId = new Map<string, AttendanceAnswerRow[]>();
    for (const answer of attendanceAnswers) {
      const current = attendanceAnswersByRegistrationId.get(answer.registration_id) ?? [];
      current.push(answer);
      attendanceAnswersByRegistrationId.set(answer.registration_id, current);
    }

    const registrationAnswersByRegistrationId = new Map<string, RegistrationAnswerRow[]>();
    for (const answer of registrationAnswers) {
      const current = registrationAnswersByRegistrationId.get(answer.registration_id) ?? [];
      current.push(answer);
      registrationAnswersByRegistrationId.set(answer.registration_id, current);
    }

    const results = registrationRows
      .map((registration) => {
        const user = userById.get(registration.user_id);
        if (!user) {
          return null;
        }

        const checkInTime = checkInByRegistrationId.get(registration.id) ?? null;
        const attendanceAnswerSummaries = (
          attendanceAnswersByRegistrationId.get(registration.id) ?? []
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
          .map((answer) => ({
            event_field_id: answer.event_field_id,
            field_type: answer.event_fields.field_type,
            field_key: answer.event_fields.field_key,
            label: answer.event_fields.label,
            answer_text: answer.answer_text,
            answer_number: answer.answer_number,
          }));

        return {
          registration_id: registration.id,
          user_id: registration.user_id,
          member_id: user.member_id,
          full_name: user.full_name,
          email: user.email,
          role: readMetadataText(user.metadata, 'role'),
          category: readMetadataText(user.metadata, 'category'),
          registration_status: registration.status,
          submitted_at: registration.submitted_at,
          check_in_status: checkInTime ? 'checked_in' : 'not_checked_in',
          official_check_in_time: checkInTime,
          registration_answers: registrationAnswerSummaries,
          attendance_answers: attendanceAnswerSummaries,
        };
      })
      .filter((value) => value !== null)
      .sort((a, b) => a.full_name.localeCompare(b.full_name));

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
