import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { formatDate, resolveDateRange } from './timeframes.ts';
import type { ToolContext } from './types.ts';

function getToken(userTokens: unknown): string | undefined {
  if (!userTokens) return undefined;
  if (Array.isArray(userTokens)) return userTokens[0]?.token;
  return (userTokens as { token?: string })?.token;
}

function getUser(usersData: unknown): { role?: string; user_tokens?: unknown } | null {
  if (!usersData) return null;
  if (Array.isArray(usersData))
    return (usersData[0] as { role?: string; user_tokens?: unknown }) ?? null;
  return usersData as { role?: string; user_tokens?: unknown };
}

function isSpecificRole(role?: string): boolean {
  if (!role) return false;
  const trimmed = role.trim().toLowerCase();
  return (
    trimmed.length > 0 &&
    !['volunteer', 'volunteers', 'all', 'any', 'member', 'members'].includes(trimmed)
  );
}

const PAGE_SIZE = 1000;

export function createGetUserServiceActivityTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    activityType: z
      .enum(['active', 'inactive'])
      .describe(
        'Whether to query for "active" volunteers (who checked in or served as walk-in) or "inactive" volunteers (who did not check in or serve) within the specified date range.',
      ),
    role: z
      .string()
      .trim()
      .optional()
      .describe(
        'Optional role filter, such as "usher" or "prayer coach". Avoid generic words like "volunteer".',
      ),
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
      "Determine a user's service attendance check-in activity within a specific date range. Use this to find active volunteers, total check-in counts (including scheduled check-ins and walk-ins), last check-in dates, identify members who have not served (inactive), or find members who checked in late or as walk-ins within a timeframe. Note: Walk-ins are active check-in attendances and count towards total service activity. Always resolves timeframes into a start and end date. NEVER returns PII like names or emails; it uses user tokens instead.",
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
        // Find active users by joining service_attendance -> users -> user_tokens across paginated pages
        const allRecords: Array<{
          service_date: string;
          checked_in_at: string | null;
          time_slot: string;
          is_override: boolean;
          is_walk_in: boolean;
          users: unknown;
        }> = [];

        let from = 0;
        while (true) {
          let query = client
            .from('service_attendance')
            .select(
              'service_date, checked_in_at, time_slot, is_override, is_walk_in, users!inner(role, user_tokens(token))',
            )
            .gte('service_date', formattedStart)
            .lte('service_date', formattedEnd)
            .order('checked_in_at', { ascending: false })
            .range(from, from + PAGE_SIZE - 1);

          if (isSpecificRole(role)) {
            query = query.ilike('users.role', `%${role!.trim()}%`);
          }

          const { data, error } = await query;
          if (error) {
            console.error('[chat:tool:getUserServiceActivity] Active query error', error);
            return { error: 'Failed to retrieve active users.' };
          }

          if (data && data.length > 0) {
            allRecords.push(...(data as typeof allRecords));
          }

          if (!data || data.length < PAGE_SIZE) {
            break;
          }
          from += PAGE_SIZE;
        }

        // Aggregate counts and track latest activity
        const userStats = new Map<
          string,
          {
            token: string;
            role: string;
            total_checkins: number;
            scheduled_checkins: number;
            walk_ins: number;
            lates: number;
            count: number;
            slots: Record<string, number>;
            last_service_date: string | null;
            last_checked_in_at: string | null;
            last_time_slot: string | null;
          }
        >();

        for (const record of allRecords) {
          const u = getUser(record.users);
          const token = getToken(u?.user_tokens);
          if (!token) continue;

          const userRole = u?.role || 'Unspecified';
          const slot = record.time_slot || 'Unknown';

          let stats = userStats.get(token);
          if (!stats) {
            stats = {
              token,
              role: userRole,
              total_checkins: 0,
              scheduled_checkins: 0,
              walk_ins: 0,
              lates: 0,
              count: 0,
              slots: {},
              last_service_date: record.service_date || null,
              last_checked_in_at: record.checked_in_at || null,
              last_time_slot: record.time_slot || null,
            };
            userStats.set(token, stats);
          }

          stats.total_checkins += 1;
          stats.count += 1; // Backwards compatibility for existing prompt logic
          stats.slots[slot] = (stats.slots[slot] || 0) + 1;
          if (record.is_walk_in) {
            stats.walk_ins += 1;
          } else {
            stats.scheduled_checkins += 1;
          }
          if (record.is_override) {
            stats.lates += 1;
          }

          if (
            record.checked_in_at &&
            (!stats.last_checked_in_at || record.checked_in_at > stats.last_checked_in_at)
          ) {
            stats.last_checked_in_at = record.checked_in_at;
            stats.last_service_date = record.service_date || null;
            stats.last_time_slot = record.time_slot || null;
          }
        }

        const sorted = Array.from(userStats.values()).sort(
          (a, b) => b.total_checkins - a.total_checkins,
        );

        let totalWalkIns = 0;
        let totalLates = 0;
        let totalCheckins = 0;
        for (const s of sorted) {
          totalCheckins += s.total_checkins;
          totalWalkIns += s.walk_ins;
          totalLates += s.lates;
        }

        return {
          timeframe: { start_date: formattedStart, end_date: formattedEnd },
          activity_type: activityType,
          role_filter: role || null,
          volunteers: sorted,
          summary: {
            total_active_volunteers: sorted.length,
            total_checkins: totalCheckins,
            total_walk_ins: totalWalkIns,
            total_lates: totalLates,
          },
        };
      } else {
        // Find inactive users
        // Get all active users with optional role
        let usersQuery = client
          .from('users')
          .select('id, role, user_tokens(token)')
          .eq('is_active', true);

        if (isSpecificRole(role)) {
          usersQuery = usersQuery.ilike('role', `%${role!.trim()}%`);
        }

        const { data: allUsers, error: usersError } = await usersQuery;

        if (usersError) {
          console.error(
            '[chat:tool:getUserServiceActivity] Inactive users query error',
            usersError,
          );
          return { error: 'Failed to retrieve users.' };
        }

        // Get all user IDs who DID check in (scheduled or walk-in) during the period across paginated pages
        const activeUserIds = new Set<string>();
        let attendanceFrom = 0;
        while (true) {
          const { data: attendanceData, error: attendanceError } = await client
            .from('service_attendance')
            .select('user_id')
            .gte('service_date', formattedStart)
            .lte('service_date', formattedEnd)
            .range(attendanceFrom, attendanceFrom + PAGE_SIZE - 1);

          if (attendanceError) {
            console.error(
              '[chat:tool:getUserServiceActivity] Inactive attendance query error',
              attendanceError,
            );
            return { error: 'Failed to retrieve attendance records.' };
          }

          if (attendanceData) {
            for (const a of attendanceData) {
              if (a.user_id) activeUserIds.add(a.user_id);
            }
          }

          if (!attendanceData || attendanceData.length < PAGE_SIZE) {
            break;
          }
          attendanceFrom += PAGE_SIZE;
        }

        // Filter users who are NOT in the activeUserIds set
        const inactiveUsers = (allUsers || [])
          .filter((u) => !activeUserIds.has(u.id))
          .map((u) => ({
            token: getToken(u.user_tokens),
            role: u.role || 'Unspecified',
          }))
          .filter((u): u is { token: string; role: string } => Boolean(u.token));

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
