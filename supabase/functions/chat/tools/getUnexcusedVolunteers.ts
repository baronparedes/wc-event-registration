import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

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

function answerValue(answer: {
  answer_date: string | null;
  answer_json: unknown;
  answer_text: string | null;
  answer_boolean: boolean | null;
  answer_number: number | null;
}): unknown {
  if (answer.answer_date !== null) return answer.answer_date;
  if (answer.answer_json !== null) return answer.answer_json;
  if (answer.answer_text) {
    try {
      return JSON.parse(answer.answer_text);
    } catch {
      return answer.answer_text;
    }
  }
  if (answer.answer_boolean !== null) return answer.answer_boolean;
  return answer.answer_number;
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
    role: z
      .string()
      .trim()
      .optional()
      .describe(
        'Optional role filter, such as "usher" or "prayer coach". Avoid generic words like "volunteer". Secondary roles (after "/") are ignored.',
      ),
    targetStartDate: z
      .string()
      .optional()
      .describe(
        'Start of the date range in YYYY-MM-DD format. Resolve natural language timeframes (e.g., "today", "this Sunday", "Sep 20") into concrete dates before calling this.',
      ),
    targetEndDate: z
      .string()
      .optional()
      .describe(
        'End of the date range in YYYY-MM-DD format. Resolve natural language timeframes into concrete dates.',
      ),
    service_slot: z
      .enum(['9AM', '12NN', '3PM'])
      .optional()
      .describe('Optional filter for a specific Sunday service time slot (9AM, 12NN, or 3PM).'),
  });

  return tool({
    description:
      'Identify unexcused absent volunteers for a given Sunday or date range. In CCF Welcome Center administration, absences are divided into 2 kinds: Excused (volunteers who submitted an approved excuse request, handled by getExcusedMembers) and Unexcused (committed volunteers who did NOT check in and have NO approved excuse request, handled by this tool). Any volunteer with a recorded service_attendance check-in is NOT unexcused. Secondary roles (after "/") are ignored. NEVER returns PII like names or emails; it uses user tokens instead.',
    parameters: schema,
    execute: async ({ role, targetStartDate, targetEndDate, service_slot }) => {
      const now = getPhNow();
      const range = resolveDateRange(targetStartDate, targetEndDate, 'coming_sunday', now);

      console.log('[chat:tool:getUnexcusedVolunteers] Executing', {
        role,
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
      const targetSundays = getSundaysInRange(range);
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
          note: 'No Sundays found within the specified date range. Volunteer commitments only apply to Sundays.',
        };
      }

      // 1. Fetch active users matching role
      let usersQuery = client
        .from('users')
        .select('id, role, metadata, user_tokens ( token )')
        .eq('is_active', true);

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

      // 2. Fetch approved excuse requests for target Sundays
      const excusedUserDates = new Set<string>(); // `${userId}:${dateStr}` or `${token}:${dateStr}`
      const excusedUserIdsByDate = new Map<string, Set<string>>(); // dateStr -> Set of userIds
      const excusedTokensByDate = new Map<string, Set<string>>(); // dateStr -> Set of tokens
      const eventId = Deno.env.get('EXCUSE_REQUEST_EVENT_ID');

      if (eventId) {
        const targetDatesSet = new Set(targetSundayDates.map(formatDate));
        const firstSunday = targetSundayDates[0];
        const lastSunday = targetSundayDates[targetSundayDates.length - 1];
        const minDate = formatDate(firstSunday);
        const maxDate = formatDate(lastSunday);

        const { data: dateAnswers, error: dateAnswersError } = await client
          .from('registration_answers')
          .select(
            'registration_id, event_fields!inner(field_key), registrations!inner(status, event_id)',
          )
          .eq('registrations.event_id', eventId)
          .neq('registrations.status', 'cancelled')
          .eq('event_fields.field_key', 'request_date')
          .or(
            `and(answer_date.gte.${minDate},answer_date.lte.${maxDate}),and(answer_text.gte.${minDate},answer_text.lte.${maxDate})`,
          );

        if (!dateAnswersError && dateAnswers && dateAnswers.length > 0) {
          const registrationIds = [
            ...new Set(
              (dateAnswers as { registration_id: string }[])
                .map((a) => a.registration_id)
                .filter(Boolean),
            ),
          ];

          const { data: registrations } = await client
            .from('registrations')
            .select(
              `
              id,
              users!inner ( id, user_tokens ( token ) ),
              registration_answers (
                answer_text, answer_date, answer_number, answer_boolean, answer_json,
                event_fields ( field_key )
              )
            `,
            )
            .in('id', registrationIds);

          for (const reg of registrations ?? []) {
            const rel = Array.isArray(reg.users) ? reg.users[0] : reg.users;
            if (!rel?.id) continue;

            const regToken = getToken(rel.user_tokens);

            let requestDate = '';
            for (const answer of (reg.registration_answers ?? []) as Array<{
              answer_text: string | null;
              answer_date: string | null;
              answer_number: number | null;
              answer_boolean: boolean | null;
              answer_json: unknown;
              event_fields: { field_key: string } | { field_key: string }[];
            }>) {
              const field = Array.isArray(answer.event_fields)
                ? answer.event_fields[0]?.field_key
                : answer.event_fields?.field_key;
              if (field === 'request_date') {
                requestDate = cleanDateOnly(answerValue(answer));
              }
            }

            if (targetDatesSet.has(requestDate)) {
              excusedUserDates.add(`${rel.id}:${requestDate}`);
              if (!excusedUserIdsByDate.has(requestDate)) {
                excusedUserIdsByDate.set(requestDate, new Set());
              }
              excusedUserIdsByDate.get(requestDate)!.add(rel.id);

              if (regToken) {
                excusedUserDates.add(`${regToken}:${requestDate}`);
                if (!excusedTokensByDate.has(requestDate)) {
                  excusedTokensByDate.set(requestDate, new Set());
                }
                excusedTokensByDate.get(requestDate)!.add(regToken);
              }
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
        const { data: attendanceData, error: attendanceError } = await client
          .from('service_attendance')
          .select(
            'id, user_id, service_date, checked_in_at, time_slot, users ( id, user_tokens ( token ) )',
          )
          .gte('service_date', formattedStart)
          .lte('service_date', formattedEnd)
          .order('id', { ascending: true })
          .range(attendanceFrom, attendanceFrom + PAGE_SIZE - 1);

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
          tokens: sundayUnexcused.map((v) => v.token),
          service_breakdown: Object.fromEntries(
            serviceSlots.map((slot) => [
              slot,
              { count: sundaySlotMap[slot].length, tokens: sundaySlotMap[slot] },
            ]),
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
              tokens: roleVolunteers.map((v) => v.token),
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
          serviceSlots.map((slot) => [
            slot,
            { count: serviceSlotMap[slot].length, tokens: serviceSlotMap[slot] },
          ]),
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
