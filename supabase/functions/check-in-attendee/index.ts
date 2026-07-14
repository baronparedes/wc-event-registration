import { POSTGRES_ERROR_CODES, RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const checkInAttendeeRequestSchema = z.object({
  event_id: z.string().uuid('Invalid event ID.'),
  attendee_kind: z.enum(['registered', 'public']).optional(),
  registration_id: z.string().uuid('Invalid registration ID.').optional(),
  public_registration_id: z.string().uuid('Invalid public registration ID.').optional(),
  slot: z.string().trim().min(1, 'Timeslot is required.').max(100).optional(),
});

type CheckInAttendeeRequest = z.infer<typeof checkInAttendeeRequestSchema>;

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'check-in-attendee',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'check-in-attendee',
      windowMs: RATE_LIMIT_PRESETS.checkInAttendee.windowMs,
      maxHits: RATE_LIMIT_PRESETS.checkInAttendee.maxHits,
    },
    schema: checkInAttendeeRequestSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const {
      event_id,
      attendee_kind,
      registration_id,
      public_registration_id,
      slot,
    }: CheckInAttendeeRequest = guard.data;

    const resolvedAttendeeKind: 'registered' | 'public' =
      attendee_kind ?? (public_registration_id ? 'public' : 'registered');
    const targetRegistrationId =
      resolvedAttendeeKind === 'public' ? public_registration_id : registration_id;

    if (!targetRegistrationId) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error:
            resolvedAttendeeKind === 'public'
              ? 'Public registration ID is required.'
              : 'Registration ID is required.',
          error_code: 'INVALID_REQUEST',
        },
        400,
      );
    }

    const adminClient = guard.client;

    const { data: event, error: eventError } = await adminClient
      .from('events')
      .select('starts_at, ends_at')
      .eq('id', event_id)
      .maybeSingle();

    if (eventError) {
      return errorResponse(corsHeaders, 500, 'Failed to load event details', undefined, {
        error_code: 'EVENT_LOOKUP_FAILED',
      });
    }

    if (!event) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Event not found for this check-in request.',
          error_code: 'EVENT_NOT_FOUND',
        },
        404,
      );
    }

    const { data: settings, error: settingsError } = await adminClient
      .from('attendance_settings')
      .select('attendance_enabled, timeslot_enabled, enforce_check_in_event_window, timeslots')
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

    if (settings.enforce_check_in_event_window) {
      const nowMs = Date.now();
      const startMs = event.starts_at ? Date.parse(event.starts_at) : Number.NaN;
      const endMs = event.ends_at ? Date.parse(event.ends_at) : Number.NaN;

      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error: 'Event start and end date-time are required for check-in window enforcement.',
            error_code: 'INVALID_EVENT_WINDOW',
          },
          400,
        );
      }

      if (nowMs < startMs || nowMs > endMs) {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error: 'Check-ins are only allowed during the event date-time window.',
            error_code: 'CHECK_IN_OUTSIDE_EVENT_WINDOW',
          },
          400,
        );
      }
    }

    const normalizedSlot = slot?.trim();
    const shouldRecordSlot = Boolean(normalizedSlot);
    const configuredSlots = (settings.timeslots ?? []).map((entry) => entry.trim()).filter(Boolean);
    const configuredSlotSet = new Set(configuredSlots);

    if (settings.timeslot_enabled) {
      if (!normalizedSlot) {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error: 'Timeslot selection is required when timeslot attendance is enabled.',
            error_code: 'INVALID_REQUEST',
          },
          400,
        );
      }

      if (!configuredSlotSet.has(normalizedSlot)) {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error: 'Selected timeslot is not configured for this event.',
            error_code: 'INVALID_REQUEST',
          },
          400,
        );
      }
    } else if (shouldRecordSlot) {
      return jsonResponse(
        corsHeaders,
        {
          success: false,
          error: 'Timeslot attendance is disabled for this event.',
          error_code: 'INVALID_REQUEST',
        },
        400,
      );
    }

    const recordSlot = async (checkInId: string) => {
      if (!normalizedSlot) {
        return null;
      }

      const { error: slotInsertError } = await adminClient.from('attendance_slot_records').insert({
        event_id,
        check_in_id: checkInId,
        slot: normalizedSlot,
      });

      if (slotInsertError && slotInsertError.code !== POSTGRES_ERROR_CODES.uniqueViolation) {
        return errorResponse(corsHeaders, 500, 'Failed to record slot attendance', undefined, {
          error_code: 'SLOT_RECORD_INSERT_FAILED',
        });
      }

      return null;
    };

    if (resolvedAttendeeKind === 'registered') {
      const { data: registration, error: registrationError } = await adminClient
        .from('registrations')
        .select('id, status')
        .eq('id', targetRegistrationId)
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
    } else {
      const { data: publicRegistration, error: publicRegistrationError } = await adminClient
        .from('public_registrations')
        .select('id, status')
        .eq('id', targetRegistrationId)
        .eq('event_id', event_id)
        .maybeSingle();

      if (publicRegistrationError) {
        return errorResponse(corsHeaders, 500, 'Failed to verify public registration', undefined, {
          error_code: 'PUBLIC_REGISTRATION_LOOKUP_FAILED',
        });
      }

      if (!publicRegistration) {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error: 'Public registration not found for this event.',
            error_code: 'PUBLIC_REGISTRATION_NOT_FOUND',
          },
          404,
        );
      }

      if (publicRegistration.status === 'cancelled') {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error: 'Cancelled public registrations cannot be checked in.',
            error_code: 'PUBLIC_REGISTRATION_CANCELLED',
          },
          400,
        );
      }
    }

    const { data: existingCheckIn, error: existingCheckInError } = await adminClient
      .from('attendance_check_ins')
      .select('id, first_checked_in_at')
      .eq('event_id', event_id)
      .eq(
        resolvedAttendeeKind === 'public' ? 'public_registration_id' : 'registration_id',
        targetRegistrationId,
      )
      .maybeSingle();

    if (existingCheckInError) {
      return errorResponse(corsHeaders, 500, 'Failed to load check-in state', undefined, {
        error_code: 'CHECK_IN_LOOKUP_FAILED',
      });
    }

    if (existingCheckIn?.first_checked_in_at) {
      if (shouldRecordSlot) {
        const slotRecordErrorResponse = await recordSlot(existingCheckIn.id);
        if (slotRecordErrorResponse) {
          return slotRecordErrorResponse;
        }
      }

      return jsonResponse(
        corsHeaders,
        {
          success: true,
          result: {
            success: true,
            status: 'already_checked_in',
            official_check_in_time: existingCheckIn.first_checked_in_at,
            attendee_kind: resolvedAttendeeKind,
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
        attendee_kind: resolvedAttendeeKind,
        registration_id: resolvedAttendeeKind === 'registered' ? targetRegistrationId : null,
        public_registration_id: resolvedAttendeeKind === 'public' ? targetRegistrationId : null,
        first_checked_in_at: nowIso,
      })
      .select('id, first_checked_in_at')
      .single();

    if (insertError) {
      if (insertError.code === POSTGRES_ERROR_CODES.uniqueViolation) {
        const { data: raceWinnerCheckIn } = await adminClient
          .from('attendance_check_ins')
          .select('id, first_checked_in_at')
          .eq('event_id', event_id)
          .eq(
            resolvedAttendeeKind === 'public' ? 'public_registration_id' : 'registration_id',
            targetRegistrationId,
          )
          .maybeSingle();

        if (shouldRecordSlot && raceWinnerCheckIn?.id) {
          const slotRecordErrorResponse = await recordSlot(raceWinnerCheckIn.id);
          if (slotRecordErrorResponse) {
            return slotRecordErrorResponse;
          }
        }

        return jsonResponse(
          corsHeaders,
          {
            success: true,
            result: {
              success: true,
              status: 'already_checked_in',
              official_check_in_time: raceWinnerCheckIn?.first_checked_in_at ?? nowIso,
              attendee_kind: resolvedAttendeeKind,
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

    if (shouldRecordSlot) {
      const slotRecordErrorResponse = await recordSlot(createdCheckIn.id);
      if (slotRecordErrorResponse) {
        return slotRecordErrorResponse;
      }
    }

    return jsonResponse(
      corsHeaders,
      {
        success: true,
        result: {
          success: true,
          status: 'checked_in',
          official_check_in_time: createdCheckIn.first_checked_in_at,
          attendee_kind: resolvedAttendeeKind,
          message: 'Check-in completed successfully.',
        },
      },
      200,
    );
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
