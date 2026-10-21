import { z } from '@/shared/validation.ts';

export const cronWeeklySundayDebriefPayloadSchema = z
  .object({
    sunday_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'sunday_date must be in YYYY-MM-DD format')
      .optional(),
    force: z.boolean().optional().default(true),
    notify: z.boolean().optional().default(true),
  })
  .optional()
  .default({});

export type CronWeeklySundayDebriefPayload = z.infer<typeof cronWeeklySundayDebriefPayloadSchema>;

export interface SlotStats {
  committed: number;
  present: number;
  walk_ins: number;
  late_tardy: number;
  roles?: Record<string, number>;
  committed_roles?: Record<string, number>;
  missed?: number;
}

export interface ServiceDashboardRpcResponse {
  time_slots?: Record<string, SlotStats>;
  roles?: string[];
  committed_roles?: string[];
}

export interface ComputedSundayMetrics {
  sundayDate: string;
  turnupRate: number;
  totalCommitted: number;
  totalPresent: number;
  totalWalkIns: number;
  peakSlot: string;
  slotSummaries: Array<{
    slot: string;
    committed: number;
    present: number;
    walkIns: number;
    turnupRate: number;
    surplusRoles: Array<{ role: string; diff: number }>;
    deficitRoles: Array<{ role: string; diff: number }>;
  }>;
  overallSurplusRoles: Array<{ role: string; diff: number; committed: number; present: number }>;
  overallDeficitRoles: Array<{ role: string; diff: number; committed: number; present: number }>;
}

export interface DebriefParsedResponse {
  summary: string;
  keyHighlights: string[];
}
