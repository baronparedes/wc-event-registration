import type { ComputedSundayMetrics, ServiceDashboardRpcResponse, SlotStats } from './types.ts';

const MANILA_TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Resolves the date string (YYYY-MM-DD) for the previous Sunday in Asia/Manila time.
 * If today is Monday (typical cron execution), resolves to yesterday (Sunday).
 */
export function resolvePreviousSunday(
  specifiedDate?: string,
  nowEpochMs: number = Date.now(),
): string {
  if (specifiedDate && /^\d{4}-\d{2}-\d{2}$/.test(specifiedDate)) {
    return specifiedDate;
  }

  // Calculate local date in Asia/Manila (UTC+8)
  const manilaDate = new Date(nowEpochMs + MANILA_TZ_OFFSET_MS);
  const dayOfWeek = manilaDate.getUTCDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // If today is Monday (1), subtract 1 day. If Sunday (0), subtract 7 days.
  const daysToSubtract = dayOfWeek === 0 ? 7 : dayOfWeek;
  const targetSunday = new Date(manilaDate.getTime() - daysToSubtract * ONE_DAY_MS);

  const year = targetSunday.getUTCFullYear();
  const month = String(targetSunday.getUTCMonth() + 1).padStart(2, '0');
  const day = String(targetSunday.getUTCDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Computes aggregations, peak slot, turnup rate, and role variances
 * from get_service_dashboard_stats response.
 */
export function computeSundayMetrics(
  sundayDate: string,
  dashboardStats: ServiceDashboardRpcResponse,
): ComputedSundayMetrics {
  const timeSlots = dashboardStats.time_slots ?? {};
  const slotKeys = Object.keys(timeSlots);

  let totalCommitted = 0;
  let totalPresent = 0;
  let totalWalkIns = 0;
  let peakSlot = 'N/A';
  let peakPresent = -1;

  const roleCommittedAgg: Record<string, number> = {};
  const rolePresentAgg: Record<string, number> = {};

  const slotSummaries: ComputedSundayMetrics['slotSummaries'] = [];

  for (const slot of slotKeys) {
    const stats: SlotStats = timeSlots[slot] ?? {
      committed: 0,
      present: 0,
      walk_ins: 0,
      late_tardy: 0,
    };

    totalCommitted += stats.committed;
    totalPresent += stats.present;
    totalWalkIns += stats.walk_ins;

    if (stats.present > peakPresent) {
      peakPresent = stats.present;
      peakSlot = slot;
    }

    const slotTurnup =
      stats.committed > 0 ? Math.round((stats.present / stats.committed) * 1000) / 10 : 0;

    const surplusRoles: Array<{ role: string; diff: number }> = [];
    const deficitRoles: Array<{ role: string; diff: number }> = [];

    const committedRoles = stats.committed_roles ?? {};
    const presentRoles = stats.roles ?? {};
    const allRoles = Array.from(
      new Set([...Object.keys(committedRoles), ...Object.keys(presentRoles)]),
    );

    for (const role of allRoles) {
      const comm = committedRoles[role] ?? 0;
      const pres = presentRoles[role] ?? 0;
      const diff = pres - comm;

      roleCommittedAgg[role] = (roleCommittedAgg[role] ?? 0) + comm;
      rolePresentAgg[role] = (rolePresentAgg[role] ?? 0) + pres;

      if (diff > 0) {
        surplusRoles.push({ role, diff });
      } else if (diff < 0) {
        deficitRoles.push({ role, diff });
      }
    }

    slotSummaries.push({
      slot,
      committed: stats.committed,
      present: stats.present,
      walkIns: stats.walk_ins,
      turnupRate: slotTurnup,
      surplusRoles,
      deficitRoles,
    });
  }

  const overallTurnupRate =
    totalCommitted > 0 ? Math.round((totalPresent / totalCommitted) * 1000) / 10 : 0;

  const overallSurplusRoles: ComputedSundayMetrics['overallSurplusRoles'] = [];
  const overallDeficitRoles: ComputedSundayMetrics['overallDeficitRoles'] = [];

  const allAggRoles = Array.from(
    new Set([...Object.keys(roleCommittedAgg), ...Object.keys(rolePresentAgg)]),
  );

  for (const role of allAggRoles) {
    const comm = roleCommittedAgg[role] ?? 0;
    const pres = rolePresentAgg[role] ?? 0;
    const diff = pres - comm;

    if (diff > 0) {
      overallSurplusRoles.push({ role, diff, committed: comm, present: pres });
    } else if (diff < 0) {
      overallDeficitRoles.push({ role, diff, committed: comm, present: pres });
    }
  }

  // Sort by absolute diff magnitude
  overallSurplusRoles.sort((a, b) => b.diff - a.diff);
  overallDeficitRoles.sort((a, b) => a.diff - b.diff);

  return {
    sundayDate,
    turnupRate: overallTurnupRate,
    totalCommitted,
    totalPresent,
    totalWalkIns,
    peakSlot: peakSlot === 'N/A' && slotKeys.length > 0 ? slotKeys[0] : peakSlot,
    slotSummaries,
    overallSurplusRoles,
    overallDeficitRoles,
  };
}
