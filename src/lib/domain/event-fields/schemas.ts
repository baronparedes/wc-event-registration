import { z } from 'zod';

import { VALIDATION_PATTERNS } from '@/config/constants';

export const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'email',
  'phone',
  'select',
  'radio',
  'checkbox',
  'multi_select',
  'multi_select_toggle',
  'date',
  'datetime',
  'boolean',
  'color_picker',
  'rating',
] as const;

export const FIELD_APPLICABILITY = ['members', 'guests', 'both'] as const;

export type EventFieldTypeEnum = (typeof FIELD_TYPES)[number];
export type EventFieldApplicabilityEnum = (typeof FIELD_APPLICABILITY)[number];

const fieldOptionSchema = z.object({
  label: z.string().min(1, 'Option label is required'),
  value: z.string().min(1, 'Option value is required'),
  toggle_label: z.string().optional(),
  toggle_default: z.boolean().optional(),
});

export type FieldOption = z.infer<typeof fieldOptionSchema>;

export const createEventFieldSchema = z.object({
  event_id: z.string().uuid('Invalid event ID'),
  field_key: z
    .string()
    .min(1, 'Field name is required')
    .max(100, 'Field name must be 100 characters or less')
    .regex(
      VALIDATION_PATTERNS.fieldKey,
      'Field name must use only lowercase letters, numbers, and underscores (e.g., team_name)',
    ),
  label: z
    .string()
    .min(1, 'Field label is required')
    .max(200, 'Field label must be 200 characters or less'),
  field_type: z.enum(FIELD_TYPES, { error: 'Please select a field type' }),
  applicability: z.enum(FIELD_APPLICABILITY).default('both'),
  is_required: z.boolean().default(false),
  is_active: z.boolean().default(true),
  placeholder: z
    .string()
    .max(200, 'Placeholder must be 200 characters or less')
    .nullable()
    .optional(),
  help_text: z.string().max(500, 'Help text must be 500 characters or less').nullable().optional(),
  options: z.array(fieldOptionSchema).default([]),
  validation_rules: z.record(z.string(), z.unknown()).default({}),
  display_order: z.number().int().min(0).default(0),
});

export type CreateEventFieldInput = z.infer<typeof createEventFieldSchema>;

export const updateEventFieldSchema = z.object({
  id: z.string().uuid('Invalid field ID'),
  event_id: z.string().uuid('Invalid event ID'),
  label: z
    .string()
    .min(1, 'Field label is required')
    .max(200, 'Field label must be 200 characters or less')
    .optional(),
  field_type: z.enum(FIELD_TYPES).optional(),
  applicability: z.enum(FIELD_APPLICABILITY).optional(),
  is_required: z.boolean().optional(),
  is_active: z.boolean().optional(),
  placeholder: z.string().max(200).nullable().optional(),
  help_text: z.string().max(500).nullable().optional(),
  options: z.array(fieldOptionSchema).optional(),
  validation_rules: z.record(z.string(), z.unknown()).optional(),
  display_order: z.number().int().min(0).optional(),
});

export type UpdateEventFieldInput = z.infer<typeof updateEventFieldSchema>;

export const reorderEventFieldsSchema = z.object({
  event_id: z.string().uuid(),
  orderedIds: z.array(z.string().uuid()).min(1, 'At least one field ID is required'),
});

export type ReorderEventFieldsInput = z.infer<typeof reorderEventFieldsSchema>;

export const eventFieldFormSchema = z
  .object({
    field_key: z
      .string()
      .min(1, 'Field name is required')
      .max(100, 'Maximum 100 characters')
      .regex(
        VALIDATION_PATTERNS.fieldKey,
        'Use only lowercase letters, numbers, and underscores (e.g., team_name)',
      ),
    label: z.string().min(1, 'Field label is required').max(200, 'Maximum 200 characters'),
    field_type: z.enum(FIELD_TYPES, { error: 'Please select a field type' }),
    applicability: z.enum(FIELD_APPLICABILITY, {
      error: 'Please select who can see this field',
    }),
    is_required: z.boolean(),
    is_active: z.boolean(),
    placeholder: z.string().max(200, 'Maximum 200 characters').nullable(),
    help_text: z.string().max(500, 'Maximum 500 characters').nullable(),
    options: z.array(
      z.object({
        label: z.string().min(1, 'Option label is required'),
        value: z.string().min(1, 'Option value is required'),
        toggle_label: z.string(),
        toggle_default: z.boolean().optional(),
        max_slots: z.string(),
        role_allotments: z.array(
          z.object({
            role: z.string(),
            alloted_slots: z.string(),
          }),
        ),
      }),
    ),
    val_min_length: z.string(),
    val_max_length: z.string(),
    val_pattern: z.string(),
    val_min: z.string(),
    val_max: z.string(),
    val_min_selections: z.string(),
    val_max_selections: z.string(),
    val_min_date: z.string(),
    val_max_date: z.string(),
    val_max_past_days: z.string(),
    val_allowed_weekdays: z.array(z.enum(['0', '1', '2', '3', '4', '5', '6'])).optional(),
    val_unique_key_component: z.boolean().default(false),
    val_visibility_depends_on_field_key: z.string().optional(),
    val_visibility_equals_value: z.string().optional(),
  })
  .superRefine((values, context) => {
    if (
      (values.field_type === 'date' || values.field_type === 'datetime') &&
      values.val_max_past_days !== ''
    ) {
      const parsedMaxPastDays = Number.parseInt(values.val_max_past_days.trim(), 10);
      if (!Number.isInteger(parsedMaxPastDays) || parsedMaxPastDays < 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Max Days In The Past must be a whole number greater than or equal to 0.',
          path: ['val_max_past_days'],
        });
      }
    }

    if (values.field_type === 'rating' && values.val_max.trim() !== '') {
      const parsedMax = Number(values.val_max.trim());
      if (!Number.isInteger(parsedMax) || parsedMax < 1 || parsedMax > 10) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Rating scale must be a whole number between 1 and 10.',
          path: ['val_max'],
        });
      }
    }

    if (values.val_unique_key_component && !values.is_required) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Fields used in duplicate matching must be required.',
        path: ['val_unique_key_component'],
      });
    }

    const hasOptionCapacity =
      values.field_type === 'select' ||
      values.field_type === 'radio' ||
      values.field_type === 'multi_select' ||
      values.field_type === 'multi_select_toggle';

    if (hasOptionCapacity) {
      values.options.forEach((option, index) => {
        option.role_allotments.forEach((allotment, allotmentIndex) => {
          const parsedSlots = Number(allotment.alloted_slots.trim());
          if (!Number.isInteger(parsedSlots) || parsedSlots <= 0) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Allotted slots must be a whole number greater than 0.',
              path: ['options', index, 'role_allotments', allotmentIndex, 'alloted_slots'],
            });
          }
        });

        const normalizedRoles = option.role_allotments
          .map((allotment) => allotment.role.trim().toLowerCase())
          .filter((role) => role.length > 0);

        const hasWildcardRole = normalizedRoles.includes('*');
        const hasNonWildcardRoles = normalizedRoles.some((role) => role !== '*');

        if (hasWildcardRole && hasNonWildcardRoles) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              'Wildcard role (*) is universal. Remove other role allotments for this option.',
            path: ['options', index, 'role_allotments'],
          });
        }
      });
    }

    if (values.field_type !== 'multi_select_toggle') {
      return;
    }

    values.options.forEach((option, index) => {
      if (option.toggle_label.trim().length === 0) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Toggle label is required',
          path: ['options', index, 'toggle_label'],
        });
      }
    });
  });

export type EventFieldFormValues = z.input<typeof eventFieldFormSchema>;

export { buildDynamicFieldResponseSchema, buildSchemaForField } from '@/lib/domain/dynamic-fields';
