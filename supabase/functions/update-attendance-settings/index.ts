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

const updateAttendanceSettingsSchema = z
  .object({
    event_id: z.string().uuid('Invalid event ID.'),
    attendance_enabled: z.boolean(),
    timeslot_enabled: z.boolean(),
    timeslots: z.array(z.string().trim().min(1, 'Timeslot value cannot be blank')).default([]),
  })
  .superRefine((value, context) => {
    if (!value.attendance_enabled && value.timeslot_enabled) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Timeslot Attendance cannot be enabled when attendance tracking is disabled.',
        path: ['timeslot_enabled'],
      });
    }

    if (value.timeslot_enabled && value.timeslots.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one timeslot is required when timeslot attendance is enabled.',
        path: ['timeslots'],
      });
    }
  });

function normalizeTimeslots(timeslots: string[]): string[] {
  const seen = new Set<string>();

  return timeslots
    .map((slot) => slot.trim())
    .filter((slot) => {
      if (slot.length === 0 || seen.has(slot)) {
        return false;
      }
      seen.add(slot);
      return true;
    });
}

function isWithinEventWindow(slot: string, startsAt: string, endsAt: string): boolean {
  const slotMs = new Date(slot).getTime();
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();

  if (!Number.isFinite(slotMs) || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return false;
  }

  return slotMs >= startMs && slotMs <= endMs;
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
      logPrefix: 'update-attendance-settings',
      supabaseUrl,
      supabaseServiceKey,
      authHeader,
      corsHeaders,
      rateLimit: {
        scope: 'update-attendance-settings',
        windowMs: 60_000,
        maxHits: 60,
      },
    });

    if (!adminAccess.ok) {
      return adminAccess.response;
    }

    const parsedBody = await parseRequestBody(req, updateAttendanceSettingsSchema);
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

    const payload = parsedBody.data;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('id, starts_at, ends_at')
      .eq('id', payload.event_id)
      .maybeSingle();

    if (eventError) {
      return errorResponse(corsHeaders, 500, 'Failed to verify event', eventError.message, {
        error_code: 'EVENT_LOOKUP_FAILED',
      });
    }

    if (!event) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Event not found',
          error_code: 'EVENT_NOT_FOUND',
        },
        404,
      );
    }

    const normalizedTimeslots =
      payload.attendance_enabled && payload.timeslot_enabled
        ? normalizeTimeslots(payload.timeslots)
        : [];

    if (payload.attendance_enabled && payload.timeslot_enabled) {
      if (!event.starts_at || !event.ends_at) {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error:
              'Event start and end date-time are required when timeslot attendance is enabled.',
            error_code: 'INVALID_EVENT_WINDOW',
          },
          400,
        );
      }

      const hasOutOfRangeTimeslot = normalizedTimeslots.some(
        (slot) => !isWithinEventWindow(slot, event.starts_at, event.ends_at),
      );

      if (hasOutOfRangeTimeslot) {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error:
              'Timeslots must be valid date-time values within the event start and end date-time window.',
            error_code: 'INVALID_TIMESLOT_RANGE',
          },
          400,
        );
      }
    }

    const { data: settings, error: upsertError } = await adminClient
      .from('attendance_settings')
      .upsert(
        {
          event_id: payload.event_id,
          attendance_enabled: payload.attendance_enabled,
          timeslot_enabled: payload.attendance_enabled ? payload.timeslot_enabled : false,
          timeslots: normalizedTimeslots,
        },
        { onConflict: 'event_id' },
      )
      .select('event_id, attendance_enabled, timeslot_enabled, timeslots, updated_at')
      .single();

    if (upsertError) {
      return errorResponse(
        corsHeaders,
        500,
        'Failed to save attendance settings',
        upsertError.message,
        {
          error_code: 'UPSERT_FAILED',
        },
      );
    }

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        settings,
      },
      200,
    );
  } catch (error) {
    console.error('[update-attendance-settings] unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
