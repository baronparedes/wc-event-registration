import { z } from 'zod';

import { FIELD_TYPES } from '@/lib/domain/event-fields';

import type { DynamicFilterExpressionNode } from './types';

const dynamicFieldRefSchema = z.object({
  source: z.enum(['registration', 'attendance', 'member', 'role', 'category']),
  fieldKey: z.string(),
  label: z.string(),
  sortOrder: z.number().optional(),
  fieldType: z.enum(FIELD_TYPES).optional(),
});

const groupByFieldRefSchema = dynamicFieldRefSchema.extend({
  groupSort: z
    .enum(['label_asc', 'label_desc', 'size_desc', 'size_asc', 'time_asc', 'time_desc'])
    .default('label_asc'),
});

const dynamicFieldFilterSchema = z.object({
  field: dynamicFieldRefSchema,
  value: z.string(),
});

const dynamicFilterExpressionNodeSchema: z.ZodType<DynamicFilterExpressionNode> = z.lazy(() =>
  z.union([
    z.object({
      type: z.literal('condition'),
      filter: dynamicFieldFilterSchema,
    }),
    z.object({
      type: z.literal('group'),
      op: z.enum(['and', 'or']),
      children: z.array(dynamicFilterExpressionNodeSchema).min(1),
    }),
    z.object({
      type: z.literal('not'),
      child: dynamicFilterExpressionNodeSchema,
    }),
  ]),
);

export const attendeeViewConfigSchema = z.object({
  nameOrMemberQuery: z.string().default(''),
  role: z.array(z.string()).default([]),
  category: z.string().default('all'),
  checkInStatus: z
    .union([z.enum(['checked_in', 'not_checked_in']), z.literal('all')])
    .default('all'),
  dynamicFilterCombination: z.enum(['and', 'or']).default('and'),
  dynamicFilters: z.array(dynamicFieldFilterSchema).default([]),
  dynamicFilterExpression: dynamicFilterExpressionNodeSchema.optional(),
  groupBy: z.array(groupByFieldRefSchema).default([]),
  visibleFields: z.array(dynamicFieldRefSchema).default([]),
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
