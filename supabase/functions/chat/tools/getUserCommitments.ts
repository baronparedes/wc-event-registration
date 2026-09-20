import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { getSundaysForTimeframe, normalizeSundayTimeframe } from './timeframes.ts';
import type { ToolContext } from './types.ts';

export function createGetUserCommitmentsTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    role: z.string().optional().describe('Filter by user role (e.g., "prayer coach", "usher").'),
    timeframe: z
      .string()
      .optional()
      .default('coming_sunday')
      .transform(normalizeSundayTimeframe)
      .describe(
        'The commitment period to summarize: "coming_sunday" (or "this_sunday"), "this_month", or "next_month". Defaults to "coming_sunday".',
      ),
    sunday_availability: z
      .enum(['first_sunday', 'second_sunday', 'third_sunday', 'fourth_sunday', 'fifth_sunday'])
      .optional()
      .describe('Filter by availability on a specific Sunday.'),
  });

  return tool({
    description:
      'Retrieve total, per-role, and per-Sunday service breakdowns with volunteer user tokens for volunteers committed on the coming Sunday, this month, or next month, optionally filtered by role. Each breakdown includes 9AM, 12NN, and 3PM counts and volunteer tokens. Use these volunteer tokens when asked who is scheduled or to list the volunteers. This tool NEVER returns PII like names or emails.',
    parameters: schema,
    execute: async ({ role, timeframe, sunday_availability }) => {
      console.log('[chat:tool:getUserCommitments] Executing', {
        role,
        timeframe,
        sunday_availability,
        requestId,
      });

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

      if (role) {
        // Assume role might be stored in the top-level 'role' column or inside metadata.
        // It's safer to filter in JS if it's case-insensitive or complex, but let's try direct DB filter for the column first, or just fetch and filter.
        // For simplicity and to handle metadata JSON accurately, we can fetch users and filter in-memory if dataset isn't huge, or use PostgREST filters.
        // Let's use ilike on role column
        query = query.ilike('role', `%${role.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[chat:tool:getUserCommitments] Query error', error);
        return { error: error.message };
      }

      const targetSundays = getSundaysForTimeframe(timeframe);
      const targetSundayDates = targetSundays.map(({ date }) => date);

      const targetSundayKeys = new Set(
        sunday_availability ? [sunday_availability] : targetSundays.map(({ key }) => key),
      );

      const serviceSlots = ['9AM', '12NN', '3PM'] as const;
      const getUsersForSundayKey = (sundayKey: string) =>
        (data || []).filter((user) => {
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

      const committedUsers = (data || []).filter((user) => {
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
            date: date.toISOString().slice(0, 10),
            sunday_key: sundayKey,
            count: sundayUsers.length,
            service_breakdown: services,
          };
        });

      const serviceBreakdown = buildServiceBreakdown(committedUsers);
      const sundayBreakdown = buildSundayBreakdown(committedUsers);

      const roleBreakdown = Object.fromEntries(
        Array.from(
          new Set(
            committedUsers.map((user) =>
              typeof user.role === 'string' && user.role.trim() ? user.role.trim() : 'Unspecified',
            ),
          ),
        ).map((roleName) => {
          const roleUsers = committedUsers.filter((user) => {
            const userRole = typeof user.role === 'string' ? user.role.trim() : 'Unspecified';
            return userRole === roleName;
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
        }),
      );

      return {
        count: committedUsers.length,
        tokens,
        service_breakdown: serviceBreakdown,
        sunday_breakdown: sundayBreakdown,
        role_breakdown: roleBreakdown,
        sundays: targetSundayDates.map((date) => date.toISOString().slice(0, 10)),
        hub_calendar_url: '/admin/hub-calendar',
      };
    },
  });
}
