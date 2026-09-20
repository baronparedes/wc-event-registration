import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { formatDate, resolveDateRange } from './timeframes.ts';
import type { ToolContext } from './types.ts';

export function createGetUserServiceActivityTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    activityType: z
      .enum(['active', 'inactive'])
      .describe(
        'Whether to query for "active" volunteers (who checked in) or "inactive" volunteers (who did not check in) within the specified date range.',
      ),
    role: z
      .string()
      .trim()
      .optional()
      .describe('Optional role filter, such as "volunteer", "usher", or "pastor".'),
    targetStartDate: z
      .string()
      .optional()
      .describe(
        'Start of the date range in YYYY-MM-DD format. Resolve natural language timeframes (e.g., "last month", "more than 3 months ago") into concrete dates before calling this.',
      ),
    targetEndDate: z
      .string()
      .optional()
      .describe(
        'End of the date range in YYYY-MM-DD format. Resolve natural language timeframes into concrete dates.',
      ),
  });

  return tool({
    description:
      'Determine a user\'s service attendance check-in activity within a specific date range. Use this to find the most active volunteers, or to identify members who have not served (inactive) within a timeframe like "last month" or "more than 3 months". Always resolves timeframes into a start and end date. NEVER returns PII like names or emails; it uses user tokens instead.',
    parameters: schema,
    execute: async ({ activityType, role, targetStartDate, targetEndDate }) => {
      const now = new Date();
      const range = resolveDateRange(targetStartDate, targetEndDate, 'this_month', now);

      console.log('[chat:tool:getUserServiceActivity] Executing', {
        activityType,
        role,
        targetStartDate,
        targetEndDate,
        resolvedRange: range
          ? { start: range.start.toISOString(), end: range.end.toISOString() }
          : null,
        requestId,
      });

      if (!range) {
        return { error: 'Could not resolve a date range for the request.' };
      }

      const formattedStart = formatDate(range.start);
      const formattedEnd = formatDate(range.end);

      if (activityType === 'active') {
        // Find active users by joining service_attendance -> users -> user_tokens
        let query = client
          .from('service_attendance')
          .select('time_slot, users!inner(role, user_tokens!inner(token))')
          .gte('service_date', formattedStart)
          .lte('service_date', formattedEnd);

        if (role) {
          query = query.ilike('users.role', `%${role}%`);
        }

        const { data, error } = await query;
        if (error) {
          console.error('[chat:tool:getUserServiceActivity] Active query error', error);
          return { error: 'Failed to retrieve active users.' };
        }

        // Aggregate counts manually
        const userStats = new Map<
          string,
          { token: string; role: string; count: number; slots: Record<string, number> }
        >();

        for (const record of data || []) {
          const u = record.users as unknown as {
            role: string;
            user_tokens: { token: string }[];
          };
          if (!u || !u.user_tokens || !u.user_tokens[0]) continue;

          const token = u.user_tokens[0].token;
          const userRole = u.role || 'Unspecified';
          const slot = record.time_slot || 'Unknown';

          let stats = userStats.get(token);
          if (!stats) {
            stats = { token, role: userRole, count: 0, slots: {} };
            userStats.set(token, stats);
          }

          stats.count += 1;
          stats.slots[slot] = (stats.slots[slot] || 0) + 1;
        }

        // Sort by count descending, return top 20
        const sorted = Array.from(userStats.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 20);

        return {
          timeframe: { start_date: formattedStart, end_date: formattedEnd },
          activity_type: 'active',
          role_filter: role || null,
          most_active_volunteers: sorted,
        };
      } else {
        // Find inactive users
        // Get all active users with optional role
        let usersQuery = client
          .from('users')
          .select('id, role, user_tokens(token)')
          .eq('is_active', true);

        if (role) {
          usersQuery = usersQuery.ilike('role', `%${role}%`);
        }

        const { data: allUsers, error: usersError } = await usersQuery;

        if (usersError) {
          console.error(
            '[chat:tool:getUserServiceActivity] Inactive users query error',
            usersError,
          );
          return { error: 'Failed to retrieve users.' };
        }

        // Get all user IDs who DID check in during the period
        const { data: attendanceData, error: attendanceError } = await client
          .from('service_attendance')
          .select('user_id')
          .gte('service_date', formattedStart)
          .lte('service_date', formattedEnd);

        if (attendanceError) {
          console.error(
            '[chat:tool:getUserServiceActivity] Inactive attendance query error',
            attendanceError,
          );
          return { error: 'Failed to retrieve attendance records.' };
        }

        const activeUserIds = new Set(attendanceData?.map((a) => a.user_id) || []);

        // Filter users who are NOT in the activeUserIds set
        const inactiveUsers = (allUsers || [])
          .filter((u) => !activeUserIds.has(u.id))
          .map((u) => ({
            token: u.user_tokens?.[0]?.token,
            role: u.role || 'Unspecified',
          }))
          .filter((u) => u.token); // ensure token exists

        return {
          timeframe: { start_date: formattedStart, end_date: formattedEnd },
          activity_type: 'inactive',
          role_filter: role || null,
          inactive_volunteers: inactiveUsers,
          total_inactive_count: inactiveUsers.length,
        };
      }
    },
  });
}
