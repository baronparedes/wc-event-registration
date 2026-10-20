import { z } from '@/shared/validation.ts';

export const broadcastToneSchema = z.enum(['pastoral', 'urgent', 'informative', 'fun']);
export type BroadcastTone = z.infer<typeof broadcastToneSchema>;

export const broadcastDraftModeSchema = z.enum(['new', 'polish']);
export type BroadcastDraftMode = z.infer<typeof broadcastDraftModeSchema>;

export const generateBroadcastDraftPayloadSchema = z.object({
  mode: broadcastDraftModeSchema.default('new'),
  notes: z
    .string()
    .min(1, 'Notes or content is required')
    .max(1500, 'Input exceeds maximum length of 1500 characters'),
  tone: broadcastToneSchema.default('pastoral'),
  targetType: z.enum(['all', 'role', 'user', 'event']).optional(),
  targetRoles: z.array(z.string()).optional(),
});

export type GenerateBroadcastDraftPayload = z.infer<typeof generateBroadcastDraftPayloadSchema>;

export const broadcastDraftVariantSchema = z.object({
  title: z.string(),
  body: z.string(),
});

export type BroadcastDraftVariant = z.infer<typeof broadcastDraftVariantSchema>;

export const generateBroadcastDraftResponseSchema = z.object({
  title: z.string(),
  message: z.string(),
  push: broadcastDraftVariantSchema.optional(),
  email: broadcastDraftVariantSchema.optional(),
});

export type GenerateBroadcastDraftResponse = z.infer<typeof generateBroadcastDraftResponseSchema>;
