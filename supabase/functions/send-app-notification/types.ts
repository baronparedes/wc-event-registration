import { z } from 'zod';

export const payloadSchema = z.object({
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  channels: z
    .array(z.enum(['push', 'email']))
    .min(1)
    .default(['push']),
  targetType: z.enum(['all', 'role', 'user', 'event']),
  targetRole: z.string().nullable().optional(),
  targetRoles: z.array(z.string()).nullable().optional(),
  targetUserId: z.string().uuid().nullable().optional(),
  targetEventId: z.string().uuid().nullable().optional(),
  url: z.string().optional(),
});

export type SendAppNotificationPayload = z.infer<typeof payloadSchema>;
