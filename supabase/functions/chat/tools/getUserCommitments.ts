import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { getPrimaryRole, isSpecificRole, matchesPrimaryRole } from './roles.ts';
import { formatDate, getPhNow, getSundaysInRange, resolveDateRange } from './timeframes.ts';
import type { ToolContext } from './types.ts';

export function createGetUserCommitmentsTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    role: z
      .string()
      .trim()
      .optional()
      .describe(
        'Filter by user role (e.g., "prayer coach", "usher"). If a member has multiple roles separated by a slash (e.g., "Primary / Secondary"), only the primary role before the "/" is evaluated; the secondary role is ignored.',
      ),
    targetStartDate: z
      .string()
      .optional()
      .describe(
        'Start of the date range in YYYY-MM-DD format. Resolve any natural-language timeframe (e.g. "this Sunday", "next month") to a concrete date before calling this tool.',
      ),
    targetEndDate: z
      .string()
      .optional()
      .describe(
        'End of the date range in YYYY-MM-DD format. Resolve any natural-language timeframe to a concrete date before calling this tool.',
      ),
    sunday_availability: z
      .enum(['first_sunday', 'second_sunday', 'third_sunday', 'fourth_sunday', 'fifth_sunday'])
      .optional()
      .describe('Filter by availability on a specific Sunday within the resolved date range.'),
  });

  return tool({
    description:
      'Retrieve total, per-role, and per-Sunday service breakdowns with volunteer user tokens for volunteers committed within the specified date range, optionally filtered by role. Defaults to the coming Sunday when no dates are provided. Each breakdown includes 9AM, 12NN, and 3PM counts and volunteer tokens. Secondary roles (after "/") are ignored for role filtering and role breakdown; only the primary role (before "/") is evaluated. Use these volunteer tokens when asked who is scheduled or to list the volunteers. This tool NEVER returns PII like names or emails.',
    parameters: schema,
    execute: async ({ role, targetStartDate, targetEndDate, sunday_availability }) => {
      const now = getPhNow();
      const range = resolveDateRange(targetStartDate, targetEndDate, 'coming_sunday', now);

      console.log('[chat:tool:getUserCommitments] Executing', {
        role,
        targetStartDate,
        targetEndDate,
        resolvedRange: range
          ? { start: range.start.toISOString(), end: range.end.toISOString() }
          : null,
        sunday_availability,
        requestId,
      });

      if (!range) {
        return { error: 'Could not resolve a date range for the request.' };
      }

      // Start the query on users
      let query = client
        .from('users')
        .select(
          `
          role,
          metadata,
          user_tokens ( token )
        `,
        )
        .eq('is_active', true);

      if (isSpecificRole(role)) {
        const cleanRole = getPrimaryRole(role).toLowerCase();
        query = query.ilike('role', `%${cleanRole}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[chat:tool:getUserCommitments] Query error', error);
        return { error: error.message };
      }

      const roleFilteredData = (data || []).filter((user) => matchesPrimaryRole(user.role, role));

      const targetSundays = getSundaysInRange(range);
      const targetSundayDates = targetSundays.map(({ date }) => date);

      if (targetSundayDates.length === 0) {
        return {
          count: 0,
          tokens: [],
          service_breakdown: {},
          sunday_breakdown: [],
          role_breakdown: {},
          sundays: [],
          hub_calendar_url: '/admin/hub-calendar',
          note: 'No Sundays found within the specified date range.',
        };
      }

      const targetSundayKeys = new Set(
        sunday_availability ? [sunday_availability] : targetSundays.map(({ key }) => key),
      );

      const serviceSlots = ['9AM', '12NN', '3PM'] as const;
      const getUsersForSundayKey = (sundayKey: string) =>
        roleFilteredData.filter((user) => {
          const metadata = user.metadata as Record<string, unknown> | null;
          if (!metadata) return false;

          const availability = metadata[sundayKey];
          if (availability === true) return true;
          return typeof availability === 'string' && availability.trim().length > 0;
        });

      const hasServiceSlot = (
        user: { metadata: unknown },
        sundayKey: string,
        serviceSlot: string,
      ) => {
        const metadata = user.metadata as Record<string, unknown> | null;
        const availability = metadata?.[sundayKey];
        if (availability === true) return true;
        if (typeof availability !== 'string') return false;
        return availability
          .split(',')
          .map((slot) => slot.trim().toUpperCase().replace(/\s+/g, ''))
          .includes(serviceSlot);
      };

      const committedUsers = roleFilteredData.filter((user) => {
        const metadata = user.metadata as Record<string, unknown> | null;
        if (!metadata) return false;

        return Array.from(targetSundayKeys).some((sundayKey) => {
          const availability = metadata[sundayKey];
          if (typeof availability !== 'string') return availability === true;
          return availability.trim().length > 0;
        });
      });

      const getToken = (user: (typeof committedUsers)[number]) => {
        const tokensArray = user.user_tokens;
        if (Array.isArray(tokensArray)) return tokensArray[0]?.token;
        return (tokensArray as { token?: string })?.token;
      };

      const tokens = committedUsers
        .map(getToken)
        .filter((token): token is string => Boolean(token));

      const buildServiceBreakdown = (users: typeof committedUsers) =>
        Object.fromEntries(
          serviceSlots.map((serviceSlot) => {
            const serviceUsers = users.filter((user) =>
              Array.from(targetSundayKeys).some((sundayKey) =>
                hasServiceSlot(user, sundayKey, serviceSlot),
              ),
            );
            const serviceTokens = serviceUsers
              .map(getToken)
              .filter((token): token is string => Boolean(token));

            return [serviceSlot, { count: serviceUsers.length, tokens: serviceTokens }];
          }),
        );

      const buildSundayBreakdown = (users: typeof committedUsers) =>
        targetSundayDates.map((date, index) => {
          const sundayKey = sunday_availability ?? targetSundays[index].key;
          const sundayUsers = users.filter((user) =>
            getUsersForSundayKey(sundayKey).some((matchingUser) => matchingUser === user),
          );
          const services = Object.fromEntries(
            serviceSlots.map((serviceSlot) => {
              const serviceUsers = sundayUsers.filter((user) =>
                hasServiceSlot(user, sundayKey, serviceSlot),
              );
              const serviceTokens = serviceUsers
                .map(getToken)
                .filter((token): token is string => Boolean(token));

              return [serviceSlot, { count: serviceUsers.length, tokens: serviceTokens }];
            }),
          );

          return {
            date: formatDate(date),
            sunday_key: sundayKey,
            count: sundayUsers.length,
            service_breakdown: services,
          };
        });

      const serviceBreakdown = buildServiceBreakdown(committedUsers);
      const sundayBreakdown = buildSundayBreakdown(committedUsers);

      const roleBreakdown = Object.fromEntries(
        Array.from(new Set(committedUsers.map((user) => getPrimaryRole(user.role)))).map(
          (roleName) => {
            const roleUsers = committedUsers.filter((user) => {
              return getPrimaryRole(user.role) === roleName;
            });

            return [
              roleName,
              {
                count: roleUsers.length,
                tokens: roleUsers.map(getToken).filter((token): token is string => Boolean(token)),
                service_breakdown: buildServiceBreakdown(roleUsers),
                sunday_breakdown: buildSundayBreakdown(roleUsers),
              },
            ];
          },
        ),
      );

      return {
        count: committedUsers.length,
        tokens,
        service_breakdown: serviceBreakdown,
        sunday_breakdown: sundayBreakdown,
        role_breakdown: roleBreakdown,
        sundays: targetSundayDates.map(formatDate),
        hub_calendar_url: '/admin/hub-calendar',
      };
    },
  });
}
