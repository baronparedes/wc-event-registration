import { z } from 'zod';

import { VALIDATION_PATTERNS } from '@/config/constants';

const emailPattern = VALIDATION_PATTERNS.email;
const phonePattern = VALIDATION_PATTERNS.phone;

function coerceOptionalString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

const attendanceSettingsBaseSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  attendance_enabled: z.boolean(),
  walk_in_mode_enabled: z.boolean(),
  timeslot_enabled: z.boolean(),
  timeslots: z.array(z.string().trim().min(1, 'Timeslot value cannot be blank')).default([]),
  updated_at: z.string().optional(),
});

function applyAttendanceSettingsRules(
  value: {
    attendance_enabled: boolean;
    walk_in_mode_enabled: boolean;
    timeslot_enabled: boolean;
    timeslots: string[];
  },
  context: z.RefinementCtx,
) {
  if (!value.attendance_enabled && value.walk_in_mode_enabled) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Walk-In Mode cannot be enabled when attendance tracking is disabled.',
      path: ['walk_in_mode_enabled'],
    });
  }

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
    walk_in_mode_enabled: true,
    timeslot_enabled: true,
    timeslots: true,
  })
  .superRefine(applyAttendanceSettingsRules);

export type UpdateAttendanceSettingsInput = z.infer<typeof updateAttendanceSettingsSchema>;

export const walkInPayloadSchema = z
  .object({
    full_name: z
      .string()
      .trim()
      .min(1, 'Full name is required')
      .max(200, 'Full name must be 200 characters or less'),
    email: z
      .preprocess(
        coerceOptionalString,
        z
          .string()
          .trim()
          .max(320, 'Email must be 320 characters or less')
          .refine((candidate) => emailPattern.test(candidate), 'Enter a valid email address')
          .optional(),
      )
      .nullable()
      .optional(),
    phone: z
      .preprocess(
        coerceOptionalString,
        z
          .string()
          .trim()
          .max(50, 'Phone must be 50 characters or less')
          .refine(
            (candidate) => phonePattern.test(candidate),
            'Enter a valid Philippine mobile number',
          )
          .optional(),
      )
      .nullable()
      .optional(),
  })
  .superRefine((value, context) => {
    const hasEmail = typeof value.email === 'string' && value.email.trim().length > 0;
    const hasPhone = typeof value.phone === 'string' && value.phone.trim().length > 0;

    if (!hasEmail && !hasPhone) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide at least one contact method (email or phone).',
        path: ['email'],
      });
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide at least one contact method (email or phone).',
        path: ['phone'],
      });
    }
  });

export type WalkInPayloadInput = z.infer<typeof walkInPayloadSchema>;

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
