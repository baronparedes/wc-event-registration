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

export interface GenerateDebriefEmailParams {
  sundayDate: string;
  turnupRate: number;
  peakSlot: string;
  totalCommitted: number;
  totalPresent: number;
  totalWalkIns: number;
  summary: string;
  keyHighlights: string[];
  actionUrl: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generateDebriefEmailText(params: GenerateDebriefEmailParams): string {
  const highlightsList = params.keyHighlights.map((h) => `• ${h}`).join('\n');
  return `CCF Welcome Center — Sunday Executive Debrief (${params.sundayDate})
Turn-up Rate: ${params.turnupRate}% | Peak: ${params.peakSlot}
Present: ${params.totalPresent} / ${params.totalCommitted} | Walk-ins: +${params.totalWalkIns}

${params.summary}

Executive Highlights:
${highlightsList}

View the full debrief in the Services Dashboard:
${params.actionUrl}
`;
}

export function generateDebriefEmailHtml(params: GenerateDebriefEmailParams): string {
  const paragraphs = params.summary.split(/\n\s*\n/).filter(Boolean);
  const highlightsHtml = params.keyHighlights
    .map((h) => `<li style="margin-bottom: 6px; color: #334155;">${escapeHtml(h)}</li>`)
    .join('');
  const paragraphsHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #1e293b;">${escapeHtml(p)}</p>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sunday Executive Debrief</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden;">
    <div style="background-color: #009688; padding: 24px 32px; color: #ffffff;">
      <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">Sunday Executive Debrief</h1>
      <p style="margin: 4px 0 0 0; font-size: 13px; color: #e6fffa;">CCF Welcome Center • ${escapeHtml(params.sundayDate)}</p>
    </div>
    <div style="padding: 32px;">
      <table style="width: 100%; border-collapse: separate; border-spacing: 8px; margin-bottom: 20px;">
        <tr>
          <td style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; width: 50%;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Turn-up Rate</div>
            <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 2px;">${params.turnupRate}%</div>
          </td>
          <td style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; width: 50%;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Peak Slot</div>
            <div style="font-size: 22px; font-weight: 700; color: #0f172a; margin-top: 2px;">${escapeHtml(params.peakSlot)}</div>
          </td>
        </tr>
        <tr>
          <td style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; width: 50%;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Present / Committed</div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 2px;">${params.totalPresent} <span style="font-size: 13px; font-weight: 400; color: #64748b;">/ ${params.totalCommitted}</span></div>
          </td>
          <td style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; width: 50%;">
            <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Walk-ins</div>
            <div style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 2px;">+${params.totalWalkIns}</div>
          </td>
        </tr>
      </table>

      ${
        params.keyHighlights.length > 0
          ? `<div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin-bottom: 6px;">Executive Highlights</div>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px 8px 18px; margin-bottom: 24px;">
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5;">
          ${highlightsHtml}
        </ul>
      </div>`
          : ''
      }

      <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; margin-bottom: 8px;">Executive Summary</div>
      <div style="font-size: 14px; line-height: 1.6; color: #1e293b; margin-bottom: 28px;">
        ${paragraphsHtml}
      </div>

      <div style="text-align: center; margin: 28px 0 8px 0;">
        <a href="${escapeHtml(params.actionUrl)}" style="display: inline-block; background-color: #009688; color: #ffffff !important; text-decoration: none; font-size: 14px; font-weight: 600; padding: 12px 28px; border-radius: 6px;">View in Services Dashboard</a>
      </div>
    </div>
    <div style="padding: 16px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
      Automated executive debrief generated by Hub AI for the OIC role.
    </div>
  </div>
</body>
</html>`;
}
