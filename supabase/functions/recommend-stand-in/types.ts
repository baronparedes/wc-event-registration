import { z } from '@/shared/validation.ts';

export const standInCandidateInputSchema = z.object({
  token: z.string().min(1, 'Candidate token is required'),
  turnupRate: z.number().min(0).max(100),
  attendanceScore: z.number(),
  tier: z.enum(['solid', 'moderate']),
  usualSlots: z.array(z.string()).optional(),
});

export type StandInCandidateInput = z.infer<typeof standInCandidateInputSchema>;

export const recommendStandInPayloadSchema = z.object({
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'),
  timeSlot: z.enum(['9AM', '12NN', '3PM']),
  role: z.string().min(1, 'Role is required'),
  excusedMemberToken: z.string().optional(),
  neededCount: z.number().int().min(1).max(20).optional(),
  candidates: z
    .array(standInCandidateInputSchema)
    .min(1, 'At least one candidate is required')
    .max(30, 'Maximum of 30 candidates allowed per evaluation'),
});

export type RecommendStandInPayload = z.infer<typeof recommendStandInPayloadSchema>;

export const standInRecommendationSchema = z.object({
  candidateToken: z.string(),
  rank: z.number().int().min(1),
  reasoning: z.string(),
});

export type StandInRecommendation = z.infer<typeof standInRecommendationSchema>;

export const standInInvitationsSchema = z.object({
  sms: z.string(),
  viber: z.string(),
  whatsapp: z.string().optional(),
  email: z.object({
    subject: z.string(),
    body: z.string(),
  }),
});

export type StandInInvitations = z.infer<typeof standInInvitationsSchema>;

export const recommendStandInResponseSchema = z.object({
  recommendations: z.array(standInRecommendationSchema),
  invitations: standInInvitationsSchema,
});

export type RecommendStandInResponse = z.infer<typeof recommendStandInResponseSchema>;
