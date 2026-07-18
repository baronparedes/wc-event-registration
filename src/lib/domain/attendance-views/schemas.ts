import { z } from 'zod';

const dynamicFieldRefSchema = z.object({
  source: z.enum(['registration', 'attendance', 'role', 'category']),
  fieldKey: z.string(),
  label: z.string(),
  sortOrder: z.number().optional(),
});

const dynamicFieldFilterSchema = z.object({
  field: dynamicFieldRefSchema,
  value: z.string(),
});

export const attendeeViewConfigSchema = z.object({
  nameOrMemberQuery: z.string().default(''),
  role: z.array(z.string()).default([]),
  category: z.string().default('all'),
  checkInStatus: z
    .union([z.enum(['checked_in', 'not_checked_in']), z.literal('all')])
    .default('all'),
  dynamicFilters: z.array(dynamicFieldFilterSchema).default([]),
  groupBy: z.array(dynamicFieldRefSchema).default([]),
});

export const upsertAttendanceSavedViewSchema = z.object({
  id: z.string().uuid().optional(),
  event_id: z.string().uuid(),
  name: z.string().min(1, 'Name is required').max(200).optional(),
  view_config: attendeeViewConfigSchema,
});

export const deleteAttendanceSavedViewSchema = z.object({
  id: z.string().uuid(),
});

export type UpsertAttendanceSavedViewRequest = z.infer<typeof upsertAttendanceSavedViewSchema>;
export type DeleteAttendanceSavedViewRequest = z.infer<typeof deleteAttendanceSavedViewSchema>;
