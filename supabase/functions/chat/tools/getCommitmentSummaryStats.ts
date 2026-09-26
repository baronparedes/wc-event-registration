import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { getPrimaryRole, isSpecificRole, matchesPrimaryRole } from './roles.ts';
import { describeDateRange, getPhNow, resolveDateRange } from './timeframes.ts';
import type { ToolContext } from './types.ts';

type CommitmentStatRow = {
  user_id: string;
  member_id: string;
  avatar_object_key: string | null;
  full_name: string;
  nickname: string;
  email: string;
  role: string;
  category: string;
  start_date: string;
  committed: number;
  attended: number;
  absences: number;
  excused: number;
  wi_9am_3pm: number;
  wi_12nn: number;
  wi_5th_sunday: number;
  attendance_score: number;
  total_count: number;
};

type RoleSummary = {
  total_volunteers: number;
  total_committed: number;
  total_attended: number;
  attendance_rate_percent: number;
  unexcused_absences: number;
  excused_absences: number;
  walk_ins: number;
  average_attendance_score: number;
};

const PAGE_SIZE = 500;

export function createGetCommitmentSummaryStatsTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    role: z
      .string()
      .trim()
      .optional()
      .describe(
        'Optional role filter, such as "usher" or "greeter". Avoid generic words like "volunteer". If a member has multiple roles separated by a slash (e.g., "Primary / Secondary"), only the primary role before the "/" is evaluated; the secondary role is ignored.',
      ),
    category: z
      .string()
      .trim()
      .optional()
      .describe('Optional volunteer category filter (e.g., "regular", "probationary").'),
    targetStartDate: z
      .string()
      .optional()
      .describe(
        'Start of the date range in YYYY-MM-DD format. Resolve natural-language timeframes (e.g., "this quarter", "last quarter", "Q1", "this year", "2026") into concrete dates before calling this tool.',
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
      'Retrieve high-level aggregate volunteer commitment metrics, overall fidelity, total scheduled commitments vs attended services, excused vs unexcused absences, walk-in support, and primary role distribution for a quarter, year, or custom date range. Defaults to the current month when no dates are specified. Does NOT return individual volunteer identities or PII. Use this tool whenever users ask about commitment dashboard summaries, overall volunteer attendance fidelity, total missed commitments, or ministry-wide score averages.',
    parameters: schema,
    execute: async ({ role, category, targetStartDate, targetEndDate }) => {
      const now = getPhNow();
      const range = resolveDateRange(targetStartDate, targetEndDate, 'this_month', now);

      console.log('[chat:tool:getCommitmentSummaryStats] Executing', {
        role,
        category,
        targetStartDate,
        targetEndDate,
        resolvedRange: range
          ? { start: range.start.toISOString(), end: range.end.toISOString() }
          : null,
        requestId,
      });

      if (!range) {
        return { error: 'Could not resolve a date range for the commitment summary query.' };
      }

      const { start_date: formattedStart, end_date: formattedEnd } = describeDateRange(range);

      const allStats: CommitmentStatRow[] = [];
      let page = 1;

      while (true) {
        const { data, error } = await client.rpc('get_commitment_dashboard_stats', {
          p_start_date: formattedStart,
          p_end_date: formattedEnd,
          p_role: isSpecificRole(role) ? getPrimaryRole(role) : null,
          p_category: category || null,
          p_page: page,
          p_page_size: PAGE_SIZE,
        });

        if (error) {
          console.error('[chat:tool:getCommitmentSummaryStats] RPC error', { error, requestId });
          return { error: `Failed to retrieve commitment summary statistics: ${error.message}` };
        }

        const rows = (data ?? []) as CommitmentStatRow[];
        if (rows.length > 0) {
          allStats.push(...rows);
        }

        const totalCount = rows.length > 0 ? Number(rows[0].total_count) : 0;
        if (allStats.length >= totalCount || rows.length < PAGE_SIZE) {
          break;
        }
        page += 1;
      }

      const filtered = allStats.filter((row) => matchesPrimaryRole(row.role, role));

      let totalCommitted = 0;
      let totalAttended = 0;
      let totalUnexcused = 0;
      let totalExcused = 0;
      let totalWi9am3pm = 0;
      let totalWi12nn = 0;
      let totalWi5thSunday = 0;
      let totalScoreSum = 0;

      const roleMap = new Map<
        string,
        {
          count: number;
          committed: number;
          attended: number;
          unexcused: number;
          excused: number;
          walk_ins: number;
          scoreSum: number;
        }
      >();

      for (const row of filtered) {
        const committed = Number(row.committed);
        const attended = Number(row.attended);
        const unexcused = Number(row.absences);
        const excused = Number(row.excused);
        const wi9or3 = Number(row.wi_9am_3pm);
        const wi12 = Number(row.wi_12nn);
        const wi5th = Number(row.wi_5th_sunday ?? 0);
        const score = Number(row.attendance_score);
        const walkIns = wi9or3 + wi12 + wi5th;

        totalCommitted += committed;
        totalAttended += attended;
        totalUnexcused += unexcused;
        totalExcused += excused;
        totalWi9am3pm += wi9or3;
        totalWi12nn += wi12;
        totalWi5thSunday += wi5th;
        totalScoreSum += score;

        const primaryRole = getPrimaryRole(row.role);
        let roleEntry = roleMap.get(primaryRole);
        if (!roleEntry) {
          roleEntry = {
            count: 0,
            committed: 0,
            attended: 0,
            unexcused: 0,
            excused: 0,
            walk_ins: 0,
            scoreSum: 0,
          };
          roleMap.set(primaryRole, roleEntry);
        }

        roleEntry.count += 1;
        roleEntry.committed += committed;
        roleEntry.attended += attended;
        roleEntry.unexcused += unexcused;
        roleEntry.excused += excused;
        roleEntry.walk_ins += walkIns;
        roleEntry.scoreSum += score;
      }

      const overallAttendanceRate =
        totalCommitted > 0 ? Math.round((totalAttended / totalCommitted) * 100) : 0;
      const averageAttendanceScore =
        filtered.length > 0 ? Number((totalScoreSum / filtered.length).toFixed(2)) : 0;
      const totalWalkIns = totalWi9am3pm + totalWi12nn + totalWi5thSunday;

      const roleBreakdown: Record<string, RoleSummary> = {};
      for (const [rName, rData] of roleMap.entries()) {
        roleBreakdown[rName] = {
          total_volunteers: rData.count,
          total_committed: rData.committed,
          total_attended: rData.attended,
          attendance_rate_percent:
            rData.committed > 0 ? Math.round((rData.attended / rData.committed) * 100) : 0,
          unexcused_absences: rData.unexcused,
          excused_absences: rData.excused,
          walk_ins: rData.walk_ins,
          average_attendance_score:
            rData.count > 0 ? Number((rData.scoreSum / rData.count).toFixed(2)) : 0,
        };
      }

      return {
        timeframe: { start_date: formattedStart, end_date: formattedEnd },
        role_filter: role ? getPrimaryRole(role) : null,
        category_filter: category || null,
        summary: {
          total_active_volunteers: filtered.length,
          total_committed_slots: totalCommitted,
          total_attended_slots: totalAttended,
          overall_attendance_rate_percent: overallAttendanceRate,
          total_unexcused_absences: totalUnexcused,
          total_excused_absences: totalExcused,
          total_walk_ins: totalWalkIns,
          walk_ins_breakdown: {
            peak_services_9am_3pm: totalWi9am3pm,
            midday_service_12nn: totalWi12nn,
            fifth_sunday: totalWi5thSunday,
          },
          average_attendance_score: averageAttendanceScore,
        },
        roles_breakdown: roleBreakdown,
      };
    },
  });
}
