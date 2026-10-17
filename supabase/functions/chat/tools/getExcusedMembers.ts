import { tool } from 'ai';
import { z } from 'chat-zod';

import { getPrimaryRole, isSpecificRole, matchesPrimaryRole } from './roles.ts';
import { formatDate, getPhNow, getSundaysInRange, resolveDateRange } from './timeframes.ts';
import type { ToolContext } from './types.ts';

const serviceSlots = ['9AM', '12NN', '3PM'] as const;

type ExcusedRecord = {
  userId: string;
  memberId: string;
  requestDate: string;
  services: string;
  reason?: string;
};

function parseServiceSlots(servicesText: string) {
  const normalized = servicesText.trim().toUpperCase();
  if (!normalized || normalized.includes('ALL')) return [...serviceSlots];

  return serviceSlots.filter((serviceSlot) =>
    normalized
      .split(/[,;/]+/)
      .map((slot) => slot.trim().replace(/\s+/g, ''))
      .some((slot) => slot === serviceSlot || slot.startsWith(serviceSlot)),
  );
}

export function createGetExcusedMembersTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    role: z
      .string()
      .trim()
      .optional()
      .describe(
        'Filter by user role, such as "usher" or "prayer coach". If a member has multiple roles separated by a slash (e.g., "Primary / Secondary"), only the primary role before the "/" is evaluated; the secondary role is ignored.',
      ),
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
        'Start of the date range in YYYY-MM-DD format. Resolve any natural-language timeframe (e.g. "this Sunday", "next month") to a concrete date before calling this tool.',
      ),
    targetEndDate: z
      .string()
      .optional()
      .describe(
        'End of the date range in YYYY-MM-DD format. Resolve any natural-language timeframe to a concrete date before calling this tool.',
      ),
  });

  return tool({
    description:
      'Retrieve approved volunteer excuses by Sunday, role, and service with volunteer user tokens, optionally filtered by user tokens. In CCF Welcome Center administration, absences are divided into 2 kinds: Excused (volunteers who submitted an approved excuse request, handled by this tool) and Unexcused (committed volunteers who did not check in and have no approved excuse request, handled by getUnexcusedVolunteers). Defaults to the coming Sunday when no dates are provided. Secondary roles (after "/") are ignored for role filtering and role breakdown; only the primary role (before "/") is evaluated. Use this for questions about which volunteers are excused or unavailable. This tool NEVER returns PII like names or emails.',
    inputSchema: schema,
    execute: async ({ role, userTokens, targetStartDate, targetEndDate }) => {
      const now = getPhNow();
      const range = resolveDateRange(targetStartDate, targetEndDate, 'coming_sunday', now);

      const tokensList = userTokens
        ? (Array.isArray(userTokens) ? userTokens : [userTokens])
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      console.log('[chat:tool:getExcusedMembers] Executing', {
        role,
        userTokens: tokensList,
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

      const targetSundays = getSundaysInRange(range);
      const targetSundayDates = targetSundays.map(({ date }) => date);

      if (targetSundayDates.length === 0) {
        return {
          count: 0,
          tokens: [],
          service_breakdown: Object.fromEntries(
            serviceSlots.map((serviceSlot) => [serviceSlot, { count: 0 }]),
          ),
          sunday_breakdown: [],
          role_breakdown: {},
          note: 'No Sundays found within the specified date range.',
        };
      }

      let targetUserIds: string[] | null = null;
      if (tokensList.length > 0) {
        const { data: tokenData, error: tokenError } = await client
          .from('user_tokens')
          .select('user_id, token')
          .in('token', tokensList);

        if (tokenError) {
          console.error('[chat:tool:getExcusedMembers] Token lookup error', tokenError);
          return { error: tokenError.message };
        }

        targetUserIds = (tokenData ?? [])
          .map((t) => t.user_id)
          .filter((id): id is string => Boolean(id));

        if (targetUserIds.length === 0) {
          return {
            count: 0,
            tokens: [],
            service_breakdown: Object.fromEntries(
              serviceSlots.map((serviceSlot) => [serviceSlot, { count: 0 }]),
            ),
            sunday_breakdown: targetSundayDates.map((date) => ({
              date: formatDate(date),
              count: 0,
              service_breakdown: Object.fromEntries(
                serviceSlots.map((serviceSlot) => [serviceSlot, { count: 0 }]),
              ),
            })),
            role_breakdown: {},
            note: `No volunteers found matching tokens: ${tokensList.join(', ')}.`,
          };
        }
      }

      const queryMonth = targetSundayDates[0];
      const targetYear = queryMonth.getFullYear();
      const targetMonthIndex = queryMonth.getMonth();

      const monthStr = String(targetMonthIndex + 1).padStart(2, '0');
      const datePrefix = `${targetYear}-${monthStr}`;
      const startDate = `${datePrefix}-01`;
      const daysInMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
      const endDate = `${datePrefix}-${String(daysInMonth).padStart(2, '0')}`;

      let excusesQuery = client
        .from('service_excuse_requests')
        .select('id, user_id, member_id, request_date, services, reason')
        .eq('status', 'approved')
        .gte('request_date', startDate)
        .lte('request_date', endDate);

      if (targetUserIds && targetUserIds.length > 0) {
        excusesQuery = excusesQuery.in('user_id', targetUserIds);
      }

      const { data: excuseRows, error: excusesError } = await excusesQuery;
      if (excusesError) return { error: excusesError.message };

      const records: ExcusedRecord[] = [];
      for (const row of excuseRows ?? []) {
        const cleanDate = (row.request_date ?? '').split('T')[0].trim();
        if (cleanDate.startsWith(datePrefix)) {
          let servicesStr = '';
          if (Array.isArray(row.services)) {
            servicesStr = row.services.join(', ');
          } else if (typeof row.services === 'string') {
            servicesStr = row.services;
          }

          records.push({
            userId: row.user_id,
            memberId: row.member_id,
            requestDate: cleanDate,
            services: servicesStr,
            reason: row.reason ?? '',
          });
        }
      }

      const targetDates = new Set(targetSundayDates.map((date) => formatDate(date)));
      const filteredRecords = records.filter((record) => targetDates.has(record.requestDate));
      const userIds = [...new Set(filteredRecords.map((record) => record.userId).filter(Boolean))];

      if (userIds.length === 0) {
        return {
          count: 0,
          tokens: [],
          service_breakdown: Object.fromEntries(
            serviceSlots.map((serviceSlot) => [serviceSlot, { count: 0, tokens: [] }]),
          ),
          sunday_breakdown: targetSundayDates.map((date) => ({
            date: formatDate(date),
            count: 0,
            service_breakdown: Object.fromEntries(
              serviceSlots.map((serviceSlot) => [serviceSlot, { count: 0, tokens: [] }]),
            ),
          })),
          role_breakdown: {},
        };
      }

      let userQuery = client
        .from('users')
        .select('id, member_id, role, user_tokens ( token )')
        .in('id', userIds)
        .eq('is_active', true);
      if (isSpecificRole(role)) {
        const cleanRole = getPrimaryRole(role).toLowerCase();
        userQuery = userQuery.ilike('role', `%${cleanRole}%`);
      }

      const { data: rawUsers, error: userError } = await userQuery;
      if (userError) {
        console.error('[chat:tool:getExcusedMembers] User query error', userError);
        return { error: userError.message };
      }

      const users = (rawUsers ?? []).filter((user) => matchesPrimaryRole(user.role, role));

      const userById = new Map(users.map((user) => [user.id, user]));
      const matchingRecords = filteredRecords.filter((record) => userById.has(record.userId));
      const getToken = (user: (typeof users)[number]) => {
        const tokens = user.user_tokens;
        if (Array.isArray(tokens)) return tokens[0]?.token;
        return (tokens as { token?: string })?.token;
      };

      const recordsFor = (date: string, serviceSlot?: string) =>
        matchingRecords.filter(
          (record) =>
            record.requestDate === date &&
            (!serviceSlot || parseServiceSlots(record.services).includes(serviceSlot as never)),
        );

      const usersFor = (date: string, serviceSlot?: string) => {
        const ids = new Set(recordsFor(date, serviceSlot).map((record) => record.userId));
        return users.filter((user) => ids.has(user.id));
      };

      const breakdownFor = (date: string) => {
        const dateUsers = usersFor(date);
        return {
          count: dateUsers.length,
          service_breakdown: Object.fromEntries(
            serviceSlots.map((serviceSlot) => {
              const serviceUsers = usersFor(date, serviceSlot);
              return [
                serviceSlot,
                {
                  count: serviceUsers.length,
                },
              ];
            }),
          ),
        };
      };

      const dateKeys = targetSundayDates.map((date) => formatDate(date));
      const allUsers = [...new Set(dateKeys.flatMap((date) => usersFor(date)))];
      const roleNames = [...new Set(allUsers.map((user) => getPrimaryRole(user.role)))];

      const excusedVolunteers = allUsers.map((user) => {
        const token = getToken(user) ?? 'Unknown';
        const userRecords = matchingRecords.filter((r) => r.userId === user.id);
        return {
          token,
          role: getPrimaryRole(user.role),
          dates: [...new Set(userRecords.map((r) => r.requestDate))],
          services: [...new Set(userRecords.flatMap((r) => parseServiceSlots(r.services)))],
          reasons: [...new Set(userRecords.map((r) => r.reason).filter(Boolean))],
        };
      });

      return {
        count: allUsers.length,
        tokens: allUsers.map(getToken).filter((token): token is string => Boolean(token)),
        excused_volunteers: excusedVolunteers,
        service_breakdown: Object.fromEntries(
          serviceSlots.map((serviceSlot) => {
            const serviceUsers = [
              ...new Set(dateKeys.flatMap((date) => usersFor(date, serviceSlot))),
            ];
            return [
              serviceSlot,
              {
                count: serviceUsers.length,
              },
            ];
          }),
        ),
        sunday_breakdown: targetSundayDates.map((date) => ({
          date: formatDate(date),
          ...breakdownFor(formatDate(date)),
        })),
        role_breakdown: Object.fromEntries(
          roleNames.map((roleName) => {
            const roleUsers = allUsers.filter((user) => {
              return getPrimaryRole(user.role) === roleName;
            });
            return [
              roleName,
              {
                count: roleUsers.length,
              },
            ];
          }),
        ),
      };
    },
  });
}
