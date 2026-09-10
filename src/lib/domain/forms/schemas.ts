import { z } from 'zod';

export const formStatusSchema = z.enum(['draft', 'published', 'archived']);
export const formAudienceSchema = z.enum(['members', 'public', 'members_and_public']);
export const formDuplicatePolicySchema = z.enum([
  'block',
  'allow_update',
  'allow_multiple',
  'allow_multiple_update',
]);

export const formFieldApplicabilitySchema = z.enum(['all', 'member_only', 'public_only']);

export const adminFormInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens'),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().nullable().optional(),
  status: formStatusSchema,
  duplicate_policy: formDuplicatePolicySchema,
  audience: formAudienceSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type AdminFormInput = z.infer<typeof adminFormInputSchema>;

export const formFieldOptionSchema = z.object({
  label: z.string().trim().min(1, 'Option label is required'),
  value: z.string().trim().min(1, 'Option value is required'),
});

export const formFieldInputSchema = z.object({
  field_key: z
    .string()
    .trim()
    .min(1, 'Field key is required')
    .regex(/^[a-z0-9_]+$/, 'Field key must be lowercase letters, numbers, and underscores'),
  label: z.string().trim().min(1, 'Label is required'),
  field_type: z.enum([
    'text',
    'textarea',
    'number',
    'email',
    'phone',
    'select',
    'radio',
    'checkbox',
    'multi_select',
    'date',
    'datetime',
    'boolean',
  ]),
  is_required: z.boolean().default(false),
  is_active: z.boolean().default(true),
  placeholder: z.string().trim().nullable().optional(),
  help_text: z.string().trim().nullable().optional(),
  options: z.array(formFieldOptionSchema).default([]),
  validation_rules: z.record(z.string(), z.unknown()).default({}),
  field_applicability: formFieldApplicabilitySchema.default('all'),
  display_order: z.number().int().min(0).default(0),
});

export type FormFieldInput = z.infer<typeof formFieldInputSchema>;

// Form values type used in react-hook-form (options as object array with id for useFieldArray)
export const formFieldFormOptionSchema = z.object({
  label: z.string().trim().min(1, 'Option label is required'),
  value: z.string().trim().min(1, 'Option value is required'),
});

export const formFieldFormSchema = z.object({
  field_key: z
    .string()
    .trim()
    .min(1, 'Field key is required')
    .regex(/^[a-z0-9_]+$/, 'Field key must be lowercase letters, numbers, and underscores'),
  label: z.string().trim().min(1, 'Label is required'),
  field_type: z.enum([
    'text',
    'textarea',
    'number',
    'email',
    'phone',
    'select',
    'radio',
    'checkbox',
    'multi_select',
    'date',
    'datetime',
    'boolean',
  ]),
  is_required: z.boolean().default(false),
  is_active: z.boolean().default(true),
  placeholder: z.string().trim().optional().default(''),
  help_text: z.string().trim().optional().default(''),
  options: z.array(formFieldFormOptionSchema).default([]),
  field_applicability: formFieldApplicabilitySchema.default('all'),
});

export type FormFieldFormValues = {
  field_key: string;
  label: string;
  field_type:
    | 'text'
    | 'textarea'
    | 'number'
    | 'email'
    | 'phone'
    | 'select'
    | 'radio'
    | 'checkbox'
    | 'multi_select'
    | 'date'
    | 'datetime'
    | 'boolean';
  is_required: boolean;
  is_active: boolean;
  placeholder: string;
  help_text: string;
  options: Array<{ label: string; value: string }>;
  field_applicability: 'all' | 'member_only' | 'public_only';
};

export const DEFAULT_FORM_FIELD_VALUES: FormFieldFormValues = {
  field_key: '',
  label: '',
  field_type: 'text',
  is_required: false,
  is_active: true,
  placeholder: '',
  help_text: '',
  options: [],
  field_applicability: 'all',
};
