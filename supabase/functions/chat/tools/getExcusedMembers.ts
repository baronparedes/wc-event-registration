import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { getSundaysForTimeframe } from './timeframes.ts';
import type { ToolContext } from './types.ts';

const serviceSlots = ['9AM', '12NN', '3PM'] as const;

type ExcusedRecord = {
  userId: string;
  memberId: string;
  requestDate: string;
  services: string;
  reason?: string;
};

type RegistrationAnswer = {
  answer_text: string | null;
  answer_date: string | null;
  answer_number: number | null;
  answer_boolean: boolean | null;
  answer_json: unknown;
  event_fields: { field_key: string } | { field_key: string }[] | null;
};

function answerValue(answer: RegistrationAnswer): unknown {
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

function valueText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (Array.isArray(value)) return value.map(valueText).join(', ');
  return String(value);
}

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
    role: z.string().optional().describe('Filter by user role, such as "volunteer" or "usher".'),
    timeframe: z
      .enum(['coming_sunday', 'this_month', 'next_month'])
      .default('coming_sunday')
      .describe('The excuse period to summarize.'),
  });

  return tool({
    description:
      'Retrieve approved volunteer excuses by Sunday, role, and service. Use this for questions about which volunteers are excused or unavailable. This tool NEVER returns PII like names or emails.',
    parameters: schema,
    execute: async ({ role, timeframe }) => {
      console.log('[chat:tool:getExcusedMembers] Executing', { role, timeframe, requestId });

      const targetSundays = getSundaysForTimeframe(timeframe);
      const targetSundayDates = targetSundays.map(({ date }) => date);

      const queryMonth = targetSundayDates[0];
      const targetYear = queryMonth.getFullYear();
      const targetMonthIndex = queryMonth.getMonth();

      const eventId = Deno.env.get('UPCOMING_SUNDAY_EVENT_ID');
      if (!eventId) return { error: 'Event ID not configured' };

      const monthStr = String(targetMonthIndex + 1).padStart(2, '0');
      const datePrefix = `${targetYear}-${monthStr}`;
      const startDate = `${datePrefix}-01`;
      const daysInMonth = new Date(targetYear, targetMonthIndex + 1, 0).getDate();
      const endDate = `${datePrefix}-${String(daysInMonth).padStart(2, '0')}`;

      const { data: dateAnswers, error: dateAnswersError } = await client
        .from('registration_answers')
        .select(
          'registration_id, event_fields!inner(field_key), registrations!inner(status, event_id)',
        )
        .eq('registrations.event_id', eventId)
        .neq('registrations.status', 'cancelled')
        .eq('event_fields.field_key', 'request_date')
        .or(
          `and(answer_date.gte.${startDate},answer_date.lte.${endDate}),answer_text.ilike.%${datePrefix}%`,
        );

      if (dateAnswersError) return { error: dateAnswersError.message };

      const registrationIds = [
        ...new Set(
          ((dateAnswers as { registration_id: string }[] | null) ?? [])
            .map((answer) => answer.registration_id)
            .filter(Boolean),
        ),
      ];

      const { data: registrations, error: registrationsError } = await client
        .from('registrations')
        .select(
          `
          id,
          users!inner ( member_id, id ),
          registration_answers (
            answer_text, answer_date, answer_number, answer_boolean, answer_json,
            event_fields ( field_key )
          )
        `,
        )
        .in('id', registrationIds);

      if (registrationsError) return { error: registrationsError.message };

      const records: ExcusedRecord[] = [];
      for (const registration of registrations ?? []) {
        const relation = Array.isArray(registration.users)
          ? registration.users[0]
          : registration.users;
        if (!relation?.id || !relation.member_id) continue;

        let requestDate = '';
        let services = '';
        let reason = '';
        for (const answer of (registration.registration_answers ?? []) as RegistrationAnswer[]) {
          const field = Array.isArray(answer.event_fields)
            ? answer.event_fields[0]?.field_key
            : answer.event_fields?.field_key;
          const text = valueText(answerValue(answer));
          if (field === 'request_date') requestDate = text;
          if (field === 'services') services = text;
          if (field === 'reason') reason = text;
        }

        const cleanDate = requestDate.split('T')[0].trim();
        if (cleanDate.startsWith(datePrefix)) {
          records.push({
            userId: relation.id,
            memberId: relation.member_id,
            requestDate: cleanDate,
            services,
            reason,
          });
        }
      }

      const targetDates = new Set(targetSundayDates.map((date) => date.toISOString().slice(0, 10)));
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
            date: date.toISOString().slice(0, 10),
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
      if (role) userQuery = userQuery.ilike('role', `%${role.trim()}%`);

      const { data: users, error: userError } = await userQuery;
      if (userError) {
        console.error('[chat:tool:getExcusedMembers] User query error', userError);
        return { error: userError.message };
      }

      const userById = new Map((users ?? []).map((user) => [user.id, user]));
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
        return (users ?? []).filter((user) => ids.has(user.id));
      };

      const breakdownFor = (date: string) => {
        const dateUsers = usersFor(date);
        return {
          count: dateUsers.length,
          tokens: dateUsers.map(getToken).filter((token): token is string => Boolean(token)),
          service_breakdown: Object.fromEntries(
            serviceSlots.map((serviceSlot) => {
              const serviceUsers = usersFor(date, serviceSlot);
              return [
                serviceSlot,
                {
                  count: serviceUsers.length,
                  tokens: serviceUsers
                    .map(getToken)
                    .filter((token): token is string => Boolean(token)),
                },
              ];
            }),
          ),
        };
      };

      const dateKeys = targetSundayDates.map((date) => date.toISOString().slice(0, 10));
      const allUsers = [...new Set(dateKeys.flatMap((date) => usersFor(date)))];
      const roleNames = [
        ...new Set(
          allUsers.map((user) =>
            typeof user.role === 'string' && user.role.trim() ? user.role.trim() : 'Unspecified',
          ),
        ),
      ];

      return {
        count: allUsers.length,
        tokens: allUsers.map(getToken).filter((token): token is string => Boolean(token)),
        service_breakdown: Object.fromEntries(
          serviceSlots.map((serviceSlot) => {
            const serviceUsers = [
              ...new Set(dateKeys.flatMap((date) => usersFor(date, serviceSlot))),
            ];
            return [
              serviceSlot,
              {
                count: serviceUsers.length,
                tokens: serviceUsers
                  .map(getToken)
                  .filter((token): token is string => Boolean(token)),
              },
            ];
          }),
        ),
        sunday_breakdown: targetSundayDates.map((date) => ({
          date: date.toISOString().slice(0, 10),
          ...breakdownFor(date.toISOString().slice(0, 10)),
        })),
        role_breakdown: Object.fromEntries(
          roleNames.map((roleName) => {
            const roleUsers = allUsers.filter((user) => {
              const userRole = typeof user.role === 'string' ? user.role.trim() : 'Unspecified';
              return userRole === roleName;
            });
            return [
              roleName,
              {
                count: roleUsers.length,
                tokens: roleUsers.map(getToken).filter((token): token is string => Boolean(token)),
                service_breakdown: Object.fromEntries(
                  serviceSlots.map((serviceSlot) => {
                    const serviceUsers = roleUsers.filter((user) =>
                      dateKeys.some((date) =>
                        usersFor(date, serviceSlot).some((candidate) => candidate.id === user.id),
                      ),
                    );
                    return [
                      serviceSlot,
                      {
                        count: serviceUsers.length,
                        tokens: serviceUsers
                          .map(getToken)
                          .filter((token): token is string => Boolean(token)),
                      },
                    ];
                  }),
                ),
              },
            ];
          }),
        ),
      };
    },
  });
}
