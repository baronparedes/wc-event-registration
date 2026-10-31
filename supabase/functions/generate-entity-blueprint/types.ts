import { z } from '@/shared/validation.ts';

export const entityBlueprintDomainSchema = z.enum(['event', 'form']);
export type EntityBlueprintDomain = z.infer<typeof entityBlueprintDomainSchema>;

export const entityAudienceSchema = z.enum(['members', 'public', 'members_and_public']);
export type EntityAudience = z.infer<typeof entityAudienceSchema>;

export const generateEntityBlueprintPayloadSchema = z.object({
  domain: entityBlueprintDomainSchema,
  prompt: z
    .string()
    .min(3, 'Prompt is required and must be at least 3 characters')
    .max(2000, 'Prompt exceeds maximum length of 2000 characters'),
  audiencePreference: entityAudienceSchema.optional(),
});

export type GenerateEntityBlueprintPayload = z.infer<typeof generateEntityBlueprintPayloadSchema>;

export const dynamicFieldTypeSchema = z.enum([
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
  'rating',
  'boolean',
]);
export type BlueprintDynamicFieldType = z.infer<typeof dynamicFieldTypeSchema>;

export const blueprintFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});
export type BlueprintFieldOption = z.infer<typeof blueprintFieldOptionSchema>;

export const blueprintVisibilityRuleSchema = z.object({
  depends_on_field_key: z.string(),
  equals_value: z.string(),
});
export type BlueprintVisibilityRule = z.infer<typeof blueprintVisibilityRuleSchema>;

export const blueprintDynamicFieldSchema = z.object({
  field_key: z.string(),
  label: z.string(),
  field_type: dynamicFieldTypeSchema,
  is_required: z.boolean(),
  placeholder: z.string().nullable().optional(),
  help_text: z.string().nullable().optional(),
  options: z.array(blueprintFieldOptionSchema).default([]),
  validation_rules: z
    .object({
      visibility_rule: blueprintVisibilityRuleSchema.optional(),
      min_length: z.number().optional(),
      max_length: z.number().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .default({}),
});
export type BlueprintDynamicField = z.infer<typeof blueprintDynamicFieldSchema>;

export const entityBlueprintMetadataSchema = z.object({
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  location: z.string().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  registration_opens_at: z.string().nullable().optional(),
  registration_closes_at: z.string().nullable().optional(),
  audience: entityAudienceSchema,
  duplicate_policy: z.enum(['block', 'allow_update', 'allow_multiple']),
  registration_mode: z.enum(['open', 'closed']).optional(),
  suggested_duration_hours: z.number().optional(),
});
export type EntityBlueprintMetadata = z.infer<typeof entityBlueprintMetadataSchema>;

export const generateEntityBlueprintResponseSchema = z.object({
  success: z.boolean().default(true),
  domain: entityBlueprintDomainSchema,
  metadata: entityBlueprintMetadataSchema,
  fields: z.array(blueprintDynamicFieldSchema),
});
export type GenerateEntityBlueprintResponse = z.infer<typeof generateEntityBlueprintResponseSchema>;
