import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

import { POSTGRES_ERROR_CODES } from '@/shared/constants.ts';
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

const checkInAttendeeRequestSchema = z.object({
  event_id: z.string().uuid('Invalid event ID.'),
  registration_id: z.string().uuid('Invalid registration ID.'),
});

type CheckInAttendeeRequest = z.infer<typeof checkInAttendeeRequestSchema>;

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
      logPrefix: 'check-in-attendee',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'check-in-attendee',
        windowMs: 60_000,
        maxHits: 180,
      },
    });

    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const parsedBody = await parseRequestBody(req, checkInAttendeeRequestSchema);
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

    const { event_id, registration_id }: CheckInAttendeeRequest = parsedBody.data;

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

    const { data: registration, error: registrationError } = await adminClient
      .from('registrations')
      .select('id, status')
      .eq('id', registration_id)
      .eq('event_id', event_id)
      .maybeSingle();

    if (registrationError) {
      return errorResponse(corsHeaders, 500, 'Failed to verify registration', undefined, {
        error_code: 'REGISTRATION_LOOKUP_FAILED',
      });
    }

    if (!registration) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Registration not found for this event.',
          error_code: 'REGISTRATION_NOT_FOUND',
        },
        404,
      );
    }

    if (registration.status === 'cancelled') {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Cancelled registrations cannot be checked in.',
          error_code: 'REGISTRATION_CANCELLED',
        },
        400,
      );
    }

    const { data: existingCheckIn, error: existingCheckInError } = await adminClient
      .from('attendance_check_ins')
      .select('first_checked_in_at')
      .eq('event_id', event_id)
      .eq('registration_id', registration_id)
      .maybeSingle();

    if (existingCheckInError) {
      return errorResponse(corsHeaders, 500, 'Failed to load check-in state', undefined, {
        error_code: 'CHECK_IN_LOOKUP_FAILED',
      });
    }

    if (existingCheckIn?.first_checked_in_at) {
      return jsonResponse(
        corsHeaders,
        {
          success: true,
          result: {
            success: true,
            status: 'already_checked_in',
            official_check_in_time: existingCheckIn.first_checked_in_at,
            attendee_kind: 'registered',
            message: 'Attendee is already checked in.',
          },
        },
        200,
      );
    }

    const nowIso = new Date().toISOString();
    const { data: createdCheckIn, error: insertError } = await adminClient
      .from('attendance_check_ins')
      .insert({
        event_id,
        attendee_kind: 'registered',
        registration_id,
        first_checked_in_at: nowIso,
      })
      .select('first_checked_in_at')
      .single();

    if (insertError) {
      if (insertError.code === POSTGRES_ERROR_CODES.uniqueViolation) {
        const { data: raceWinnerCheckIn } = await adminClient
          .from('attendance_check_ins')
          .select('first_checked_in_at')
          .eq('event_id', event_id)
          .eq('registration_id', registration_id)
          .maybeSingle();

        return jsonResponse(
          corsHeaders,
          {
            success: true,
            result: {
              success: true,
              status: 'already_checked_in',
              official_check_in_time: raceWinnerCheckIn?.first_checked_in_at ?? nowIso,
              attendee_kind: 'registered',
              message: 'Attendee is already checked in.',
            },
          },
          200,
        );
      }

      return errorResponse(corsHeaders, 500, 'Failed to create check-in record', undefined, {
        error_code: 'CHECK_IN_INSERT_FAILED',
      });
    }

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        result: {
          success: true,
          status: 'checked_in',
          official_check_in_time: createdCheckIn.first_checked_in_at,
          attendee_kind: 'registered',
          message: 'Check-in completed successfully.',
        },
      },
      200,
    );
  } catch (error) {
    console.error('[check-in-attendee] unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
