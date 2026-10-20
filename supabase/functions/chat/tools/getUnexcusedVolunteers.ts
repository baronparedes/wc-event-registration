import { tool } from 'ai';
import { z } from 'chat-zod';

import { getPrimaryRole, isSpecificRole, matchesPrimaryRole } from './roles.ts';
import { formatDate, getPhNow, getSundaysInRange, resolveDateRange } from './timeframes.ts';
import type { ToolContext } from './types.ts';

const PAGE_SIZE = 1000;
const serviceSlots = ['9AM', '12NN', '3PM'] as const;
type ServiceSlot = (typeof serviceSlots)[number];

function getToken(userTokens: unknown): string | undefined {
  if (!userTokens) return undefined;
  if (Array.isArray(userTokens)) return userTokens[0]?.token;
  return (userTokens as { token?: string })?.token;
}

function cleanDateOnly(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).split('T')[0].split(' ')[0].trim();
}

function normalizeSlot(val: string): ServiceSlot | null {
  const clean = val.trim().toUpperCase().replace(/\s+/g, '');
  if (
    clean === '9AM' ||
    clean === '9:00AM' ||
    clean === '09:00AM' ||
    clean.startsWith('9:') ||
    clean.startsWith('09:')
  ) {
    return '9AM';
  }
  if (
    clean === '12NN' ||
    clean === '12:00NN' ||
    clean === '12PM' ||
    clean === '12:00PM' ||
    clean.startsWith('12:')
  ) {
    return '12NN';
  }
  if (
    clean === '3PM' ||
    clean === '3:00PM' ||
    clean === '15:00' ||
    clean.startsWith('3:') ||
    clean.startsWith('15:')
  ) {
    return '3PM';
  }
  return null;
}

function getCommittedSlots(metadata: unknown, sundayKey: string): ServiceSlot[] {
  const meta = metadata as Record<string, unknown> | null;
  const availability = meta?.[sundayKey];
  if (!availability) return [];
  if (availability === true) return [...serviceSlots];
  if (typeof availability !== 'string') return [];
  const parts = availability.split(/[,;/]+/);
  const matched = new Set<ServiceSlot>();
  for (const part of parts) {
    const slot = normalizeSlot(part);
    if (slot) matched.add(slot);
  }
  return serviceSlots.filter((slot) => matched.has(slot));
}

export function createGetUnexcusedVolunteersTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    role: z.string().trim().optional().describe('Filter by primary role (e.g. "usher")'),
    userTokens: z
      .union([z.string().trim(), z.array(z.string().trim())])
      .optional()
      .describe('Array or single user token'),
    targetStartDate: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    targetEndDate: z.string().optional().describe('End date (YYYY-MM-DD)'),
    service_slot: z.enum(['9AM', '12NN', '3PM']).optional().describe('Service slot filter'),
  });

  return tool({
    description:
      'Identify unexcused absent volunteers (committed without check-in or approved excuse).',
    inputSchema: schema,
    execute: async ({ role, userTokens, targetStartDate, targetEndDate, service_slot }) => {
      const now = getPhNow();
      const range = resolveDateRange(targetStartDate, targetEndDate, 'coming_sunday', now);

      const tokensList = userTokens
        ? (Array.isArray(userTokens) ? userTokens : [userTokens])
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      console.log('[chat:tool:getUnexcusedVolunteers] Executing', {
        role,
        userTokens: tokensList,
        targetStartDate,
        targetEndDate,
        service_slot,
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
      const todayStr = formatDate(getPhNow());
      const targetSundays = getSundaysInRange(range).filter((s) => formatDate(s.date) <= todayStr);
      const targetSundayDates = targetSundays.map(({ date }) => date);

      if (targetSundayDates.length === 0) {
        return {
          count: 0,
          tokens: [],
          service_breakdown: Object.fromEntries(
            serviceSlots.map((slot) => [slot, { count: 0, tokens: [] }]),
          ),
          role_breakdown: {},
          sunday_breakdown: [],
          volunteers: [],
          note: 'No past or current Sundays found within the specified date range. Absences cannot be evaluated for future Sundays that have not occurred yet.',
        };
      }

      let targetUserIds: string[] | null = null;
      if (tokensList.length > 0) {
        const { data: tokenData, error: tokenError } = await client
          .from('user_tokens')
          .select('user_id, token')
          .in('token', tokensList);

        if (tokenError) {
          console.error('[chat:tool:getUnexcusedVolunteers] Token lookup error', tokenError);
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
              serviceSlots.map((slot) => [slot, { count: 0, tokens: [] }]),
            ),
            role_breakdown: {},
            sunday_breakdown: [],
            volunteers: [],
            note: `No volunteers found matching tokens: ${tokensList.join(', ')}.`,
          };
        }
      }

      // 1. Fetch active users matching role
      let usersQuery = client
        .from('users')
        .select('id, role, metadata, user_tokens ( token )')
        .eq('is_active', true);

      if (targetUserIds && targetUserIds.length > 0) {
        usersQuery = usersQuery.in('id', targetUserIds);
      }

      if (isSpecificRole(role)) {
        const cleanRole = getPrimaryRole(role).toLowerCase();
        usersQuery = usersQuery.ilike('role', `%${cleanRole}%`);
      }

      const { data: rawUsers, error: usersError } = await usersQuery;
      if (usersError) {
        console.error('[chat:tool:getUnexcusedVolunteers] Users query error', usersError);
        return { error: 'Failed to retrieve volunteers.' };
      }

      const users = (rawUsers ?? []).filter((u) => matchesPrimaryRole(u.role, role));

      const userTokensById = new Map<string, string>();
      for (const u of rawUsers ?? []) {
        const token = getToken(u.user_tokens);
        if (token) userTokensById.set(u.id, token);
      }

      // 2. Fetch approved excuse requests for target Sundays
      const excusedUserDates = new Set<string>(); // `${userId}:${dateStr}` or `${token}:${dateStr}`
      const excusedUserIdsByDate = new Map<string, Set<string>>(); // dateStr -> Set of userIds
      const excusedTokensByDate = new Map<string, Set<string>>(); // dateStr -> Set of tokens

      const targetDatesSet = new Set(targetSundayDates.map(formatDate));
      const firstSunday = targetSundayDates[0];
      const lastSunday = targetSundayDates[targetSundayDates.length - 1];
      const minDate = formatDate(firstSunday);
      const maxDate = formatDate(lastSunday);

      let excusesQuery = client
        .from('service_excuse_requests')
        .select('user_id, request_date')
        .eq('status', 'approved')
        .gte('request_date', minDate)
        .lte('request_date', maxDate);

      if (targetUserIds && targetUserIds.length > 0) {
        excusesQuery = excusesQuery.in('user_id', targetUserIds);
      }

      const { data: excusesData, error: excusesError } = await excusesQuery;

      if (!excusesError && excusesData) {
        for (const row of excusesData) {
          const requestDate = (row.request_date ?? '').split('T')[0].trim();
          if (targetDatesSet.has(requestDate)) {
            excusedUserDates.add(`${row.user_id}:${requestDate}`);
            if (!excusedUserIdsByDate.has(requestDate)) {
              excusedUserIdsByDate.set(requestDate, new Set());
            }
            excusedUserIdsByDate.get(requestDate)!.add(row.user_id);

            const token = userTokensById.get(row.user_id);
            if (token) {
              excusedUserDates.add(`${token}:${requestDate}`);
              if (!excusedTokensByDate.has(requestDate)) {
                excusedTokensByDate.set(requestDate, new Set());
              }
              excusedTokensByDate.get(requestDate)!.add(token);
            }
          }
        }
      }

      // 3. Fetch check-in records for target Sundays (across paginated pages with stable ordering)
      const checkedInUserDates = new Set<string>(); // `${userId}:${date}` or `${token}:${date}`
      const checkedInUserSlots = new Set<string>(); // `${userId}:${date}:${slot}` or `${token}:${date}:${slot}`
      const checkedInUserIdsByDate = new Map<string, Set<string>>(); // date -> Set<userId>
      const checkedInTokensByDate = new Map<string, Set<string>>(); // date -> Set<token>

      let attendanceFrom = 0;
      while (true) {
        let attendanceQuery = client
          .from('service_attendance')
          .select(
            'id, user_id, service_date, checked_in_at, time_slot, users ( id, user_tokens ( token ) )',
          )
          .gte('service_date', formattedStart)
          .lte('service_date', formattedEnd)
          .order('id', { ascending: true })
          .range(attendanceFrom, attendanceFrom + PAGE_SIZE - 1);

        if (targetUserIds && targetUserIds.length > 0) {
          attendanceQuery = attendanceQuery.in('user_id', targetUserIds);
        }

        const { data: attendanceData, error: attendanceError } = await attendanceQuery;

        if (attendanceError) {
          console.error(
            '[chat:tool:getUnexcusedVolunteers] Attendance query error',
            attendanceError,
          );
          return { error: 'Failed to retrieve attendance records.' };
        }

        if (attendanceData) {
          for (const a of attendanceData) {
            const userId = a.user_id;
            const uRel = Array.isArray(a.users) ? a.users[0] : a.users;
            const token = getToken(uRel?.user_tokens);

            const datesToTrack: string[] = [];
            if (a.service_date) {
              const cleanSDate = cleanDateOnly(a.service_date);
              if (cleanSDate) datesToTrack.push(cleanSDate);
            }
            if (a.checked_in_at) {
              const cleanCDate = cleanDateOnly(a.checked_in_at);
              if (cleanCDate && !datesToTrack.includes(cleanCDate)) {
                datesToTrack.push(cleanCDate);
              }
            }

            const slot = a.time_slot ? normalizeSlot(a.time_slot) : null;

            for (const d of datesToTrack) {
              if (userId) {
                checkedInUserDates.add(`${userId}:${d}`);
                if (!checkedInUserIdsByDate.has(d)) {
                  checkedInUserIdsByDate.set(d, new Set());
                }
                checkedInUserIdsByDate.get(d)!.add(userId);

                if (slot) {
                  checkedInUserSlots.add(`${userId}:${d}:${slot}`);
                }
              }

              if (token) {
                checkedInUserDates.add(`${token}:${d}`);
                if (!checkedInTokensByDate.has(d)) {
                  checkedInTokensByDate.set(d, new Set());
                }
                checkedInTokensByDate.get(d)!.add(token);

                if (slot) {
                  checkedInUserSlots.add(`${token}:${d}:${slot}`);
                }
              }
            }
          }
        }

        if (!attendanceData || attendanceData.length < PAGE_SIZE) {
          break;
        }
        attendanceFrom += PAGE_SIZE;
      }

      // 4. Identify unexcused volunteers per Sunday
      type UnexcusedVolunteer = {
        token: string;
        role: string;
        date: string;
        committed_slots: ServiceSlot[];
      };

      const unexcusedList: UnexcusedVolunteer[] = [];
      const serviceSlotMap: Record<ServiceSlot, string[]> = {
        '9AM': [],
        '12NN': [],
        '3PM': [],
      };

      let totalCommitted = 0;
      let totalExcused = 0;
      let totalCheckedIn = 0;

      const sundayBreakdown = targetSundays.map(({ date, key: sundayKey }) => {
        const dateStr = formatDate(date);
        const sundayUnexcused: UnexcusedVolunteer[] = [];
        const sundaySlotMap: Record<ServiceSlot, string[]> = {
          '9AM': [],
          '12NN': [],
          '3PM': [],
        };

        for (const user of users) {
          const committedSlots = getCommittedSlots(user.metadata, sundayKey);
          if (committedSlots.length === 0) continue;

          totalCommitted++;
          const token = getToken(user.user_tokens);
          if (!token) continue;

          const isExcused =
            excusedUserDates.has(`${user.id}:${dateStr}`) ||
            (token ? excusedUserDates.has(`${token}:${dateStr}`) : false) ||
            Boolean(excusedUserIdsByDate.get(dateStr)?.has(user.id)) ||
            Boolean(token && excusedTokensByDate.get(dateStr)?.has(token));

          const hasCheckIn =
            checkedInUserDates.has(`${user.id}:${dateStr}`) ||
            (token ? checkedInUserDates.has(`${token}:${dateStr}`) : false) ||
            Boolean(checkedInUserIdsByDate.get(dateStr)?.has(user.id)) ||
            Boolean(token && checkedInTokensByDate.get(dateStr)?.has(token));

          if (isExcused) totalExcused++;
          if (hasCheckIn) totalCheckedIn++;

          // A volunteer is UNEXCUSED only if they had commitments, had NO excuse, and had NO check-in
          if (!isExcused && !hasCheckIn) {
            // Apply optional service_slot filter
            if (service_slot && !committedSlots.includes(service_slot)) {
              continue;
            }

            const primaryRole = getPrimaryRole(user.role);
            const volunteerObj: UnexcusedVolunteer = {
              token,
              role: primaryRole,
              date: dateStr,
              committed_slots: committedSlots,
            };

            sundayUnexcused.push(volunteerObj);
            unexcusedList.push(volunteerObj);

            for (const slot of committedSlots) {
              if (!sundaySlotMap[slot].includes(token)) {
                sundaySlotMap[slot].push(token);
              }
              if (!serviceSlotMap[slot].includes(token)) {
                serviceSlotMap[slot].push(token);
              }
            }
          }
        }

        return {
          date: dateStr,
          sunday_key: sundayKey,
          count: sundayUnexcused.length,
          service_breakdown: Object.fromEntries(
            serviceSlots.map((slot) => [slot, { count: sundaySlotMap[slot].length }]),
          ),
        };
      });

      // Role breakdown
      const uniqueRoles = [...new Set(unexcusedList.map((v) => v.role))];
      const roleBreakdown = Object.fromEntries(
        uniqueRoles.map((roleName) => {
          const roleVolunteers = unexcusedList.filter((v) => v.role === roleName);
          return [
            roleName,
            {
              count: roleVolunteers.length,
            },
          ];
        }),
      );

      const uniqueTokens = [...new Set(unexcusedList.map((v) => v.token))];

      return {
        timeframe: { start_date: formattedStart, end_date: formattedEnd },
        role_filter: role ? getPrimaryRole(role) : null,
        service_slot_filter: service_slot || null,
        count: uniqueTokens.length,
        tokens: uniqueTokens,
        volunteers: unexcusedList,
        service_breakdown: Object.fromEntries(
          serviceSlots.map((slot) => [slot, { count: serviceSlotMap[slot].length }]),
        ),
        role_breakdown: roleBreakdown,
        sunday_breakdown: sundayBreakdown,
        summary: {
          total_unexcused_volunteers: uniqueTokens.length,
          total_committed_records: totalCommitted,
          total_excused_records: totalExcused,
          total_checked_in_records: totalCheckedIn,
        },
        hub_calendar_url: '/admin/hub-calendar',
      };
    },
  });
}
