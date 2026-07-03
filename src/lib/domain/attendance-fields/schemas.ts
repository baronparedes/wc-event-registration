import { z } from 'zod';

import { VALIDATION_PATTERNS } from '@/config/constants';
import {
  FIELD_TYPES,
  type PublicEventField,
  buildDynamicFieldResponseSchema,
} from '@/lib/domain/event-fields';

import type { AttendanceField } from './types';

export const ATTENDANCE_FIELD_TYPES = FIELD_TYPES;

export type AttendanceFieldTypeEnum = (typeof ATTENDANCE_FIELD_TYPES)[number];

const attendanceFieldOptionSchema = z.object({
  label: z.string().min(1, 'Option label is required'),
  value: z.string().min(1, 'Option value is required'),
  toggle_label: z.string().optional(),
  toggle_default: z.boolean().optional(),
});

export type AttendanceFieldOptionInput = z.infer<typeof attendanceFieldOptionSchema>;

const attendanceValidationRulesSchema = z
  .object({
    min_length: z.number().int().nonnegative().optional(),
    max_length: z.number().int().nonnegative().optional(),
    pattern: z.string().optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    min_selections: z.number().int().nonnegative().optional(),
    max_selections: z.number().int().nonnegative().optional(),
    min_date: z.string().optional(),
    max_date: z.string().optional(),
  })
  .default({});

export const createAttendanceFieldSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  field_key: z
    .string()
    .min(1, 'Field key is required')
    .max(100, 'Field key must be 100 characters or less')
    .regex(
      VALIDATION_PATTERNS.fieldKey,
      'Field key must use only lowercase letters, numbers, and underscores (e.g., table_name)',
    ),
  label: z.string().min(1, 'Field label is required').max(200, 'Field label is too long'),
  field_type: z.enum(ATTENDANCE_FIELD_TYPES, { error: 'Please select a field type' }),
  is_required: z.boolean().default(false),
  display_order: z.number().int().min(0).default(0),
  options: z.array(attendanceFieldOptionSchema).default([]),
  validation_rules: attendanceValidationRulesSchema,
});

export type CreateAttendanceFieldInput = z.infer<typeof createAttendanceFieldSchema>;

export const updateAttendanceFieldSchema = z.object({
  id: z.string().uuid('Invalid field ID'),
  event_id: z.string().uuid('Invalid event ID'),
  label: z
    .string()
    .min(1, 'Field label is required')
    .max(200, 'Field label is too long')
    .optional(),
  field_type: z.enum(ATTENDANCE_FIELD_TYPES).optional(),
  is_required: z.boolean().optional(),
  display_order: z.number().int().min(0).optional(),
  options: z.array(attendanceFieldOptionSchema).optional(),
  validation_rules: attendanceValidationRulesSchema.optional(),
});

export type UpdateAttendanceFieldInput = z.infer<typeof updateAttendanceFieldSchema>;

export const deleteAttendanceFieldSchema = z.object({
  id: z.string().uuid('Invalid field ID'),
  event_id: z.string().uuid('Invalid event ID'),
});

export type DeleteAttendanceFieldInput = z.infer<typeof deleteAttendanceFieldSchema>;

export const reorderAttendanceFieldsSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  orderedIds: z
    .array(z.string().uuid('Invalid field ID'))
    .min(1, 'At least one field ID is required'),
});

export type ReorderAttendanceFieldsInput = z.infer<typeof reorderAttendanceFieldsSchema>;

function toPublicEventFields(fields: AttendanceField[]): PublicEventField[] {
  return fields.map((field) => ({
    id: field.id,
    event_id: field.event_id,
    field_key: field.field_key,
    label: field.label,
    field_type: field.field_type,
    is_required: field.is_required,
    is_active: true,
    placeholder: null,
    help_text: null,
    options: field.options,
    validation_rules: field.validation_rules,
    display_order: field.display_order,
  }));
}

export function buildDynamicAttendanceResponseSchema(
  fields: AttendanceField[],
): z.ZodObject<Record<string, z.ZodType<unknown>>> {
  return buildDynamicFieldResponseSchema(toPublicEventFields(fields));
}
