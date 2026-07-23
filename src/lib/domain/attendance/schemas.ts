import { z } from 'zod';

import type { AttendanceField } from '@/lib/domain/attendance-fields';
import { buildDynamicAttendanceResponseSchema } from '@/lib/domain/attendance-fields';

const attendanceSettingsBaseSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  attendance_enabled: z.boolean(),
  timeslot_enabled: z.boolean(),
  enforce_check_in_event_window: z.boolean().default(true),
  timeslots: z.array(z.string().trim().min(1, 'Timeslot value cannot be blank')).default([]),
  updated_at: z.string().optional(),
});

function applyAttendanceSettingsRules(
  value: {
    attendance_enabled: boolean;
    timeslot_enabled: boolean;
    timeslots: string[];
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

export function buildTimeslotSelectionSchema(configuredSlots: string[]) {
  const normalizedSlots = configuredSlots.map((slot) => slot.trim()).filter(Boolean);
  const allowedSlots = new Set(normalizedSlots);

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
