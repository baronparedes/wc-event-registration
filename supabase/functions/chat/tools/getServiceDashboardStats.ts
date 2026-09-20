import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { describeDateRange, formatDate, getPhNow, resolveDateRange } from './timeframes.ts';
import type { ToolContext } from './types.ts';

type TimeSlotData = {
  committed: number;
  present: number;
  walk_ins: number;
  late_tardy: number;
  roles?: Record<string, number>;
};

type ServiceDashboardStatsRpcResult = {
  time_slots?: Record<string, TimeSlotData>;
  roles?: string[];
};

export function createGetServiceDashboardStatsTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    targetStartDate: z
      .string()
      .optional()
      .describe(
        'Start of the date range in YYYY-MM-DD format. Resolve natural-language timeframes (e.g., "last Sunday", "August 2026", "this month", "2025") into concrete dates before calling this tool.',
      ),
    targetEndDate: z
      .string()
      .optional()
      .describe(
        'End of the date range in YYYY-MM-DD format. Resolve natural-language timeframes into concrete dates.',
      ),
  });

  return tool({
    description:
      'Retrieve high-level aggregate Sunday service attendance metrics, volunteer turn-up percentages, scheduled commitments vs actual check-ins, supervisor late/tardy overrides, walk-ins, and primary role distribution across service time slots (9AM, 12NN, 3PM) for a specific Sunday, month, year, or date range. Defaults to the previous Sunday when no dates are specified. Does NOT return individual volunteer identities or PII. Use this tool whenever users ask about service turn-up rates, attendance statistics, slot counts, walk-in totals, or role distributions across services.',
    parameters: schema,
    execute: async ({ targetStartDate, targetEndDate }) => {
      const now = getPhNow();
      const range = resolveDateRange(targetStartDate, targetEndDate, 'previous_sunday', now);

      console.log('[chat:tool:getServiceDashboardStats] Executing', {
        targetStartDate,
        targetEndDate,
        resolvedRange: range
          ? { start: range.start.toISOString(), end: range.end.toISOString() }
          : null,
        requestId,
      });

      if (!range) {
        return { error: 'Could not resolve a date range for the service dashboard query.' };
      }

      const startStr = formatDate(range.start);
      const endStr = formatDate(range.end);

      const rpcArgs: Record<string, unknown> = {};

      if (startStr === endStr) {
        // Single Sunday
        rpcArgs.p_sunday_date = startStr;
      } else if (
        range.start.getFullYear() === range.end.getFullYear() &&
        range.start.getMonth() === range.end.getMonth()
      ) {
        // Single month
        rpcArgs.p_year = range.start.getFullYear();
        rpcArgs.p_month = range.start.getMonth() + 1;
      } else if (
        range.start.getFullYear() === range.end.getFullYear() &&
        range.start.getMonth() === 0 &&
        range.start.getDate() === 1 &&
        range.end.getMonth() === 11 &&
        range.end.getDate() === 31
      ) {
        // Full year
        rpcArgs.p_year = range.start.getFullYear();
      } else {
        // Multi-week or arbitrary range
        rpcArgs.p_start_date = startStr;
        rpcArgs.p_end_date = endStr;
      }

      const { data, error } = await client.rpc('get_service_dashboard_stats', rpcArgs);

      if (error) {
        console.error('[chat:tool:getServiceDashboardStats] RPC error', { error, requestId });
        return { error: `Failed to retrieve service dashboard statistics: ${error.message}` };
      }

      const stats = (data ?? {}) as ServiceDashboardStatsRpcResult;
      const rawSlots = stats.time_slots ?? {};

      const timeSlotKeys = ['9AM', '12NN', '3PM'] as const;
      const timeSlots: Record<string, TimeSlotData & { turnup_rate_percent: number }> = {};

      let totalCommitted = 0;
      let totalPresent = 0;
      let totalWalkIns = 0;
      let totalLateTardy = 0;

      for (const ts of timeSlotKeys) {
        const slot = rawSlots[ts] ?? {
          committed: 0,
          present: 0,
          walk_ins: 0,
          late_tardy: 0,
          roles: {},
        };

        const turnup = slot.committed > 0 ? Math.round((slot.present / slot.committed) * 100) : 0;

        totalCommitted += slot.committed;
        totalPresent += slot.present;
        totalWalkIns += slot.walk_ins;
        totalLateTardy += slot.late_tardy;

        timeSlots[ts] = {
          committed: slot.committed,
          present: slot.present,
          turnup_rate_percent: turnup,
          walk_ins: slot.walk_ins,
          late_tardy: slot.late_tardy,
          roles: slot.roles ?? {},
        };
      }

      const overallTurnup =
        totalCommitted > 0 ? Math.round((totalPresent / totalCommitted) * 100) : 0;

      return {
        timeframe: describeDateRange(range),
        overall: {
          total_committed: totalCommitted,
          total_present: totalPresent,
          overall_turnup_percent: overallTurnup,
          total_walk_ins: totalWalkIns,
          total_late_tardy: totalLateTardy,
        },
        time_slots: timeSlots,
        roles: stats.roles ?? [],
      };
    },
  });
}
