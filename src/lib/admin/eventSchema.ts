import { z } from 'zod'

const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/

function applyDateRangeChecks(
  data: {
    starts_at?: string
    ends_at?: string
    registration_opens_at?: string
    registration_closes_at?: string
  },
  ctx: z.RefinementCtx,
) {
  if (data.starts_at && data.ends_at && data.ends_at <= data.starts_at) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Event end must be after event start',
      path: ['ends_at'],
    })
  }
  if (
    data.registration_opens_at &&
    data.registration_closes_at &&
    data.registration_closes_at <= data.registration_opens_at
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Registration close must be after registration open',
      path: ['registration_closes_at'],
    })
  }
}

export const createEventSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .max(100, 'Slug must be 100 characters or less')
      .regex(slugRegex, 'Slug must use only lowercase letters, numbers, and hyphens'),
    description: z.string().optional(),
    location: z.string().optional(),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
    registration_opens_at: z.string().optional(),
    registration_closes_at: z.string().optional(),
    status: z.enum(['draft', 'published', 'archived']),
    duplicate_policy: z.enum(['block', 'allow_update']),
    registration_mode: z.enum(['open', 'closed']),
  })
  .superRefine(applyDateRangeChecks)

export type CreateEventInput = z.infer<typeof createEventSchema>

export const updateEventSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
    description: z.string().optional(),
    location: z.string().optional(),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
    registration_opens_at: z.string().optional(),
    registration_closes_at: z.string().optional(),
    status: z.enum(['draft', 'published', 'archived']),
    duplicate_policy: z.enum(['block', 'allow_update']),
    registration_mode: z.enum(['open', 'closed']),
  })
  .superRefine(applyDateRangeChecks)

export type UpdateEventInput = z.infer<typeof updateEventSchema>

/**
 * Validation schema for publishing an event.
 * Requires all fields needed for a complete, registrant-facing event.
 */
export const publishEventSchema = z
  .object({
    title: z.string().min(1, 'Title is required').max(200, 'Title must be 200 characters or less'),
    slug: z
      .string()
      .min(1, 'Slug is required')
      .max(100, 'Slug must be 100 characters or less')
      .regex(slugRegex, 'Slug must use only lowercase letters, numbers, and hyphens'),
    description: z.string().min(1, 'Description is required to publish'),
    location: z.string().min(1, 'Location is required to publish'),
    starts_at: z.string().min(1, 'Event start date and time are required to publish'),
    ends_at: z.string().min(1, 'Event end date and time are required to publish'),
    registration_opens_at: z
      .string()
      .min(1, 'Registration open date and time are required to publish'),
    registration_closes_at: z
      .string()
      .min(1, 'Registration close date and time are required to publish'),
    status: z.enum(['draft', 'published', 'archived']),
    duplicate_policy: z.enum(['block', 'allow_update']),
    registration_mode: z.enum(['open', 'closed']),
  })
  .superRefine(applyDateRangeChecks)

export type PublishEventInput = z.infer<typeof publishEventSchema>
