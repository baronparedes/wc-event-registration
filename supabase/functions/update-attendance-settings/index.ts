import { RATE_LIMIT_PRESETS } from '@/shared/constants.ts';
import { useEdgeHook } from '@/shared/edge.ts';
import { errorResponse, jsonResponse } from '@/shared/http.ts';
import { z } from '@/shared/validation.ts';

const isoDateTimeStringSchema = z.string().trim().datetime({ offset: true });

const attendanceTimeslotConfigSchema = z.object({
  slot_at: isoDateTimeStringSchema,
  opens_at: isoDateTimeStringSchema.nullable(),
  closes_at: isoDateTimeStringSchema.nullable(),
});

const updateAttendanceSettingsSchema = z
  .object({
    event_id: z.string().uuid('Invalid event ID.'),
    attendance_enabled: z.boolean(),
    timeslot_enabled: z.boolean(),
    enforce_check_in_event_window: z.boolean().default(true),
    timeslots: z.array(attendanceTimeslotConfigSchema).default([]),
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

    value.timeslots.forEach((slot, index) => {
      const hasOpen = Boolean(slot.opens_at);
      const hasClose = Boolean(slot.closes_at);

      if (hasOpen !== hasClose) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Timeslot windows require both open and close date-times.',
          path: ['timeslots', index, hasOpen ? 'closes_at' : 'opens_at'],
        });
      }

      if (!hasOpen || !hasClose) {
        return;
      }

      const opensAt = Date.parse(slot.opens_at!);
      const slotAt = Date.parse(slot.slot_at);
      const closesAt = Date.parse(slot.closes_at!);

      if (opensAt > slotAt || slotAt > closesAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'Timeslot open, slot, and close date-times must satisfy opens_at <= slot_at <= closes_at.',
          path: ['timeslots', index, 'slot_at'],
        });
      }
    });

    const sortedWindows = value.timeslots
      .map((slot, index) => ({ slot, index }))
      .filter(({ slot }) => Boolean(slot.opens_at && slot.closes_at))
      .map(({ slot, index }) => ({
        index,
        opensAt: Date.parse(slot.opens_at!),
        closesAt: Date.parse(slot.closes_at!),
      }))
      .sort((left, right) => left.opensAt - right.opensAt);

    for (let index = 1; index < sortedWindows.length; index += 1) {
      if (sortedWindows[index].opensAt <= sortedWindows[index - 1].closesAt) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Timeslot windows cannot overlap.',
          path: ['timeslots', sortedWindows[index].index, 'opens_at'],
        });
      }
    }
  });

type AttendanceTimeslotConfig = z.infer<typeof attendanceTimeslotConfigSchema>;

function normalizeOptionalIsoString(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeTimeslots(timeslots: AttendanceTimeslotConfig[]): AttendanceTimeslotConfig[] {
  const seen = new Set<string>();

  return timeslots
    .map((slot) => ({
      slot_at: slot.slot_at.trim(),
      opens_at: normalizeOptionalIsoString(slot.opens_at),
      closes_at: normalizeOptionalIsoString(slot.closes_at),
    }))
    .filter((slot) => {
      const key = `${slot.slot_at}|${slot.opens_at ?? ''}|${slot.closes_at ?? ''}`;

      if (slot.slot_at.length === 0 || seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .sort((left, right) => Date.parse(left.slot_at) - Date.parse(right.slot_at));
}

function isWithinEventWindow(value: string, startsAt: string, endsAt: string): boolean {
  const slotMs = new Date(value).getTime();
  const startMs = new Date(startsAt).getTime();
  const endMs = new Date(endsAt).getTime();

  if (!Number.isFinite(slotMs) || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return false;
  }

  return slotMs >= startMs && slotMs <= endMs;
}

Deno.serve(async (req) => {
  const guard = await useEdgeHook({
    req,
    functionName: 'update-attendance-settings',
    method: 'POST',
    requireAdmin: true,
    rateLimit: {
      scope: 'update-attendance-settings',
      windowMs: RATE_LIMIT_PRESETS.updateAttendanceSettings.windowMs,
      maxHits: RATE_LIMIT_PRESETS.updateAttendanceSettings.maxHits,
    },
    schema: updateAttendanceSettingsSchema,
  });

  const corsHeaders = guard.corsHeaders;

  if (!guard.valid) {
    return guard.response;
  }

  try {
    const payload = guard.data;
    const adminClient = guard.client;

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
        (slot) =>
          !isWithinEventWindow(slot.slot_at, event.starts_at, event.ends_at) ||
          (slot.opens_at !== null &&
            !isWithinEventWindow(slot.opens_at, event.starts_at, event.ends_at)) ||
          (slot.closes_at !== null &&
            !isWithinEventWindow(slot.closes_at, event.starts_at, event.ends_at)),
      );

      if (hasOutOfRangeTimeslot) {
        return jsonResponse(
          corsHeaders,
          {
            success: false,
            error:
              'Timeslots and optional window bounds must be valid date-time values within the event start and end date-time window.',
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
          enforce_check_in_event_window: payload.attendance_enabled
            ? payload.enforce_check_in_event_window
            : true,
          timeslots: normalizedTimeslots,
        },
        { onConflict: 'event_id' },
      )
      .select(
        'event_id, attendance_enabled, timeslot_enabled, enforce_check_in_event_window, timeslots, updated_at',
      )
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
  } catch {
    return errorResponse(corsHeaders, 500, 'Internal server error');
  }
});
