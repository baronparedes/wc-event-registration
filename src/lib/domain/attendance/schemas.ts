import { z } from 'zod';

import type { AttendanceField } from '@/lib/domain/attendance-fields';
import { buildDynamicAttendanceResponseSchema } from '@/lib/domain/attendance-fields';

import type { AttendanceTimeslotConfig } from './types';

const isoDateTimeStringSchema = z.string().trim().datetime({ offset: true });

export const attendanceTimeslotConfigSchema = z.object({
  slot_at: isoDateTimeStringSchema,
  opens_at: isoDateTimeStringSchema.nullable(),
  closes_at: isoDateTimeStringSchema.nullable(),
});

function isCompleteWindow(slot: AttendanceTimeslotConfig): boolean {
  return Boolean(slot.opens_at && slot.closes_at);
}

function getTimestamp(value: string): number {
  return Date.parse(value);
}

function validateTimeslotWindows(timeslots: AttendanceTimeslotConfig[], context: z.RefinementCtx) {
  const completeWindows = timeslots
    .map((slot, index) => ({ slot, index }))
    .filter(({ slot }) => isCompleteWindow(slot));

  timeslots.forEach((slot, index) => {
    const hasOpen = Boolean(slot.opens_at);
    const hasClose = Boolean(slot.closes_at);

    if (hasOpen !== hasClose) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Timeslot windows require both open and close date-times.',
        path: ['timeslots', index, hasOpen ? 'closes_at' : 'opens_at'],
      });
    }
  });

  completeWindows.forEach(({ slot, index }) => {
    const opensAt = getTimestamp(slot.opens_at!);
    const slotAt = getTimestamp(slot.slot_at);
    const closesAt = getTimestamp(slot.closes_at!);

    if (opensAt > slotAt || slotAt > closesAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Timeslot open, slot, and close date-times must satisfy opens_at <= slot_at <= closes_at.',
        path: ['timeslots', index, 'slot_at'],
      });
    }
  });

  const sortedWindows = completeWindows
    .map(({ slot, index }) => ({
      index,
      opensAt: getTimestamp(slot.opens_at!),
      closesAt: getTimestamp(slot.closes_at!),
    }))
    .sort((left, right) => left.opensAt - right.opensAt);

  for (let index = 1; index < sortedWindows.length; index += 1) {
    const previous = sortedWindows[index - 1];
    const current = sortedWindows[index];

    if (current.opensAt <= previous.closesAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Timeslot windows cannot overlap.',
        path: ['timeslots', current.index, 'opens_at'],
      });
    }
  }
}

const attendanceSettingsBaseSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  attendance_enabled: z.boolean(),
  timeslot_enabled: z.boolean(),
  enforce_check_in_event_window: z.boolean().default(true),
  timeslots: z.array(attendanceTimeslotConfigSchema).default([]),
  updated_at: z.string().optional(),
});

function applyAttendanceSettingsRules(
  value: {
    attendance_enabled: boolean;
    timeslot_enabled: boolean;
    timeslots: AttendanceTimeslotConfig[];
  },
  context: z.RefinementCtx,
) {
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

  validateTimeslotWindows(value.timeslots, context);
}

export const attendanceSettingsSchema = attendanceSettingsBaseSchema.superRefine(
  applyAttendanceSettingsRules,
);

export type AttendanceSettingsInput = z.infer<typeof attendanceSettingsSchema>;

export const updateAttendanceSettingsSchema = attendanceSettingsBaseSchema
  .pick({
    event_id: true,
    attendance_enabled: true,
    timeslot_enabled: true,
    enforce_check_in_event_window: true,
    timeslots: true,
  })
  .superRefine(applyAttendanceSettingsRules);

export type UpdateAttendanceSettingsInput = z.infer<typeof updateAttendanceSettingsSchema>;

export const attendanceSlotPayloadSchema = z.object({
  slot: z
    .string()
    .trim()
    .min(1, 'Timeslot is required')
    .max(100, 'Timeslot must be 100 characters or less'),
});

export type AttendanceSlotPayloadInput = z.infer<typeof attendanceSlotPayloadSchema>;

export function buildTimeslotSelectionSchema(configuredSlots: AttendanceTimeslotConfig[]) {
  const allowedSlots = new Set(configuredSlots.map((slot) => slot.slot_at.trim()).filter(Boolean));

  return attendanceSlotPayloadSchema.refine((value) => allowedSlots.has(value.slot), {
    message: 'Selected timeslot is not configured for this event.',
    path: ['slot'],
  });
}

const attendanceAnswerEntrySchema = z.object({
  attendance_field_id: z.string().uuid('Invalid attendance field ID'),
  answer_text: z.string().nullable().optional(),
  answer_number: z.number().nullable().optional(),
});

export type AttendanceAnswerEntry = z.infer<typeof attendanceAnswerEntrySchema>;

export const upsertAttendanceAnswersSchema = z
  .object({
    event_id: z.string().uuid('Invalid event ID'),
    attendee_kind: z.enum(['registered', 'public']).optional(),
    registration_id: z.string().uuid('Invalid registration ID').optional(),
    public_registration_id: z.string().uuid('Invalid public registration ID').optional(),
    answers: z.array(attendanceAnswerEntrySchema),
  })
  .superRefine((value, context) => {
    /* c8 ignore next 2 */
    const attendeeKind =
      value.attendee_kind ?? (value.public_registration_id ? 'public' : 'registered');

    /* c8 ignore next 7 */
    if (attendeeKind === 'registered' && !value.registration_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Registration ID is required for registered attendees.',
        path: ['registration_id'],
      });
    }

    /* c8 ignore next 7 */
    if (attendeeKind === 'public' && !value.public_registration_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Public registration ID is required for public attendees.',
        path: ['public_registration_id'],
      });
    }
  });

export type UpsertAttendanceAnswersInput = z.infer<typeof upsertAttendanceAnswersSchema>;

const bulkAttendanceAttendeeRefSchema = z
  .object({
    attendee_kind: z.enum(['registered', 'public']),
    registration_id: z.string().uuid('Invalid registration ID').optional(),
    public_registration_id: z.string().uuid('Invalid public registration ID').optional(),
  })
  .superRefine((value, context) => {
    if (value.attendee_kind === 'registered' && !value.registration_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'registration_id is required for registered attendees.',
        path: ['registration_id'],
      });
    }

    if (value.attendee_kind === 'registered' && value.public_registration_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'public_registration_id must be empty for registered attendees.',
        path: ['public_registration_id'],
      });
    }

    if (value.attendee_kind === 'public' && !value.public_registration_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'public_registration_id is required for public attendees.',
        path: ['public_registration_id'],
      });
    }

    if (value.attendee_kind === 'public' && value.registration_id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'registration_id must be empty for public attendees.',
        path: ['registration_id'],
      });
    }
  });

export function buildBulkAttendanceCsvRowSchema(fields: AttendanceField[]) {
  const optionalFields = fields.map((field) => ({
    ...field,
    is_required: false,
  }));

  return bulkAttendanceAttendeeRefSchema.extend({
    answers: buildDynamicAttendanceResponseSchema(optionalFields),
  });
}

export function buildBulkAttendanceCsvRowsSchema(fields: AttendanceField[]) {
  return z
    .array(buildBulkAttendanceCsvRowSchema(fields))
    .min(1, 'At least one CSV row is required for bulk upload.');
}

export type BulkAttendanceCsvRowInput = z.infer<ReturnType<typeof buildBulkAttendanceCsvRowSchema>>;

export const bulkUpsertAttendanceAnswersSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  rows: z.array(z.record(z.string(), z.unknown())).min(1, 'At least one row is required'),
  uploaded_field_keys: z.array(z.string().trim().min(1)).optional(),
});

export type BulkUpsertAttendanceAnswersInput = {
  event_id: string;
  rows: BulkAttendanceCsvRowInput[];
  uploaded_field_keys?: string[];
};
