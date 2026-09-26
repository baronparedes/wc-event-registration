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

const PAGE_SIZE = 500;

export function createGetTopVolunteersByCommitmentTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    sortBy: z
      .enum(['attendance_score', 'attended'])
      .optional()
      .default('attendance_score')
      .describe(
        'Metric to rank volunteers by: "attendance_score" (weighted reliability score rewarding attendance and walk-ins while penalizing unexcused no-shows) or "attended" (total number of scheduled check-in attendances). Defaults to "attendance_score".',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .optional()
      .default(10)
      .describe('Number of top volunteers to return. Defaults to 10 (max 50).'),
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
        'Start of the date range in YYYY-MM-DD format. Resolve natural-language timeframes (e.g., "Q1 2026", "this quarter", "last quarter", "this year", "2026") into concrete dates before calling this tool.',
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
      'Retrieve top volunteer rankings and leaderboard by commitment attendance fidelity and attendance scores for a quarter, year, or custom date range. Calculates committed slots, attended services, unexcused absences, excused absences, walk-in support (9AM/3PM, 12NN, 5th Sunday), and net attendance scores. NEVER returns PII like real names or emails; it uses user tokens instead. Secondary roles (after "/") are ignored; only primary roles are evaluated.',
    parameters: schema,
    execute: async ({
      sortBy = 'attendance_score',
      limit = 10,
      role,
      category,
      targetStartDate,
      targetEndDate,
    }) => {
      const now = getPhNow();
      const range = resolveDateRange(targetStartDate, targetEndDate, 'this_month', now);

      console.log('[chat:tool:getTopVolunteersByCommitment] Executing', {
        sortBy,
        limit,
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
        return { error: 'Could not resolve a date range for the commitment leaderboard query.' };
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
          console.error('[chat:tool:getTopVolunteersByCommitment] RPC error', { error, requestId });
          return { error: `Failed to retrieve commitment stats: ${error.message}` };
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

      // Filter by primary role in TypeScript to guarantee exact primary-role boundary match
      const filtered = allStats.filter((row) => matchesPrimaryRole(row.role, role));

      // Sort by the chosen metric
      filtered.sort((a, b) => {
        if (sortBy === 'attended') {
          if (Number(b.attended) !== Number(a.attended)) {
            return Number(b.attended) - Number(a.attended);
          }
          return Number(b.attendance_score) - Number(a.attendance_score);
        }
        // Default: attendance_score
        if (Number(b.attendance_score) !== Number(a.attendance_score)) {
          return Number(b.attendance_score) - Number(a.attendance_score);
        }
        return Number(b.attended) - Number(a.attended);
      });

      const topRankedRows = filtered.slice(0, limit);
      const targetUserIds = topRankedRows.map((r) => r.user_id).filter(Boolean);
      const tokenMap = new Map<string, string>();

      // Fetch tokens only for the top sliced records in safe batch chunks
      const CHUNK_SIZE = 50;
      for (let i = 0; i < targetUserIds.length; i += CHUNK_SIZE) {
        const chunk = targetUserIds.slice(i, i + CHUNK_SIZE);
        const { data: tokenRows, error: tokenError } = await client
          .from('user_tokens')
          .select('user_id, token')
          .in('user_id', chunk);

        if (tokenError) {
          console.error('[chat:tool:getTopVolunteersByCommitment] Token query error', {
            tokenError,
            requestId,
          });
        } else if (tokenRows) {
          for (const t of tokenRows) {
            if (t.user_id && t.token) {
              tokenMap.set(t.user_id, t.token);
            }
          }
        }
      }

      const topRanked = topRankedRows.map((r) => ({
        token: tokenMap.get(r.user_id) ?? 'Unknown',
        role: getPrimaryRole(r.role),
        category: r.category || 'regular',
        start_date: r.start_date,
        attendance_score: Number(r.attendance_score),
        committed: Number(r.committed),
        attended: Number(r.attended),
        absences: Number(r.absences),
        excused: Number(r.excused),
        wi_9am_3pm: Number(r.wi_9am_3pm),
        wi_12nn: Number(r.wi_12nn),
        wi_5th_sunday: Number(r.wi_5th_sunday ?? 0),
      }));

      return {
        timeframe: { start_date: formattedStart, end_date: formattedEnd },
        sort_by: sortBy,
        role_filter: role ? getPrimaryRole(role) : null,
        category_filter: category || null,
        total_evaluated_volunteers: filtered.length,
        returned_count: topRanked.length,
        top_volunteers: topRanked,
      };
    },
  });
}
