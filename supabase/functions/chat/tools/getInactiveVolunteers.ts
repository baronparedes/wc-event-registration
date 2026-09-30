import { tool } from 'ai';
import { z } from 'chat-zod';

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

export function createGetInactiveVolunteersTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(50)
      .describe('Maximum number of inactive volunteers to return. Defaults to 50.'),
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
    userTokens: z
      .union([z.string().trim(), z.array(z.string().trim())])
      .optional()
      .describe(
        'Optional array of volunteer user tokens (e.g. ["USR_000001", "USR_000002"]) or single token string to filter results to specific members/volunteers.',
      ),
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
      'Retrieve inactive volunteers who have scheduled Sunday service commitments in the specified timeframe (e.g. this quarter, last quarter, this year, or custom dates) but recorded ZERO total attendances (both scheduled check-ins and walk-ins = 0). Returns tokenized volunteer identities with committed slots, unexcused absences, excused absences, and attendance scores. Secondary roles (after "/") are ignored; only primary roles are evaluated. NEVER returns PII like real names or emails.',
    inputSchema: schema,
    execute: async ({ limit = 50, role, category, userTokens, targetStartDate, targetEndDate }) => {
      const now = getPhNow();
      const range = resolveDateRange(targetStartDate, targetEndDate, 'this_month', now);

      const tokensList = userTokens
        ? (Array.isArray(userTokens) ? userTokens : [userTokens])
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      console.log('[chat:tool:getInactiveVolunteers] Executing', {
        limit,
        role,
        category,
        userTokens: tokensList,
        targetStartDate,
        targetEndDate,
        resolvedRange: range
          ? { start: range.start.toISOString(), end: range.end.toISOString() }
          : null,
        requestId,
      });

      if (!range) {
        return { error: 'Could not resolve a date range for the inactive volunteers query.' };
      }

      const { start_date: formattedStart, end_date: formattedEnd } = describeDateRange(range);

      let targetUserIds: string[] | null = null;
      if (tokensList.length > 0) {
        const { data: tokenData, error: tokenError } = await client
          .from('user_tokens')
          .select('user_id, token')
          .in('token', tokensList);

        if (tokenError) {
          console.error('[chat:tool:getInactiveVolunteers] Token lookup error', tokenError);
          return { error: tokenError.message };
        }

        if (!tokenData || tokenData.length === 0) {
          return {
            timeframe: { start_date: formattedStart, end_date: formattedEnd },
            role_filter: role ? getPrimaryRole(role) : null,
            category_filter: category || null,
            total_inactive_volunteers: 0,
            returned_count: 0,
            inactive_volunteers: [],
            note: `No volunteers found matching tokens: ${tokensList.join(', ')}.`,
          };
        }

        targetUserIds = tokenData.map((t) => t.user_id).filter((id): id is string => Boolean(id));
      }

      const allStats: CommitmentStatRow[] = [];
      let page = 1;

      while (true) {
        const { data, error } = await client.rpc('get_commitment_dashboard_stats', {
          p_start_date: formattedStart,
          p_end_date: formattedEnd,
          p_role: isSpecificRole(role) ? getPrimaryRole(role) : undefined,
          p_category: category || undefined,
          p_page: page,
          p_page_size: PAGE_SIZE,
        });

        if (error) {
          console.error('[chat:tool:getInactiveVolunteers] RPC error', { error, requestId });
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

      // Filter by target tokens, primary role, and inactivity criteria:
      // Inactivity = committed > 0 and total attendances == 0 (both scheduled check-ins and walk-ins = 0)
      const inactive = allStats.filter((row) => {
        if (targetUserIds && targetUserIds.length > 0) {
          if (!targetUserIds.includes(row.user_id)) {
            return false;
          }
        }

        if (!matchesPrimaryRole(row.role, role)) {
          return false;
        }

        const scheduledAttended = Number(row.attended || 0);
        const walkIns =
          Number(row.wi_9am_3pm || 0) + Number(row.wi_12nn || 0) + Number(row.wi_5th_sunday || 0);
        const totalAttended = scheduledAttended + walkIns;

        return Number(row.committed) > 0 && totalAttended === 0;
      });

      // Sort by number of committed slots descending (most missed commitments first), then attendance score ascending
      inactive.sort((a, b) => {
        if (Number(b.committed) !== Number(a.committed)) {
          return Number(b.committed) - Number(a.committed);
        }
        return Number(a.attendance_score) - Number(b.attendance_score);
      });

      const inactiveRows = inactive.slice(0, limit);
      const userIdsToLookup = inactiveRows.map((r) => r.user_id).filter(Boolean);
      const tokenMap = new Map<string, string>();

      // Fetch tokens only for the sliced records in safe batch chunks
      const CHUNK_SIZE = 50;
      for (let i = 0; i < userIdsToLookup.length; i += CHUNK_SIZE) {
        const chunk = userIdsToLookup.slice(i, i + CHUNK_SIZE);
        const { data: tokenRows, error: tokenError } = await client
          .from('user_tokens')
          .select('user_id, token')
          .in('user_id', chunk);

        if (tokenError) {
          console.error('[chat:tool:getInactiveVolunteers] Token query error', {
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

      const returnedVolunteers = inactiveRows.map((r) => {
        const scheduledAttended = Number(r.attended || 0);
        const walkIns =
          Number(r.wi_9am_3pm || 0) + Number(r.wi_12nn || 0) + Number(r.wi_5th_sunday || 0);
        const totalAttended = scheduledAttended + walkIns;

        return {
          token: tokenMap.get(r.user_id) ?? 'Unknown',
          role: getPrimaryRole(r.role),
          category: r.category || 'regular',
          start_date: r.start_date,
          committed: Number(r.committed),
          attended: totalAttended,
          scheduled_attended: scheduledAttended,
          walk_ins: walkIns,
          absences: Number(r.absences),
          excused: Number(r.excused),
          attendance_score: Number(r.attendance_score),
        };
      });

      return {
        timeframe: { start_date: formattedStart, end_date: formattedEnd },
        role_filter: role ? getPrimaryRole(role) : null,
        category_filter: category || null,
        total_inactive_volunteers: inactive.length,
        returned_count: returnedVolunteers.length,
        inactive_volunteers: returnedVolunteers,
      };
    },
  });
}
