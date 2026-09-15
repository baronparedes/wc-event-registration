import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import {
  describeMilestoneTimeframe,
  isMonthDayInTimeframe,
  normalizeMilestoneTimeframe,
} from './timeframes.ts';
import type { ToolContext } from './types.ts';

type Milestone = 'birthday' | 'wedding_anniversary';

export function createGetUpcomingMilestonesTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    timeframe: z
      .string()
      .trim()
      .min(1)
      .default('this_month')
      .describe(
        'A timeframe phrase such as today, upcoming, this week, next week, last week, last 2 weeks, this month, next month, or last month.',
      ),
  });

  return tool({
    description:
      'Retrieve birthdays and wedding anniversaries as separate counts with user tokens within the specified timeframe. This tool NEVER returns PII like names or emails.',
    parameters: schema,
    execute: async ({ timeframe: requestedTimeframe }) => {
      const now = new Date();
      const timeframe = normalizeMilestoneTimeframe(requestedTimeframe, now);
      console.log('[chat:tool:getUpcomingMilestones] Executing', {
        requestedTimeframe,
        timeframe,
        requestId,
      });

      if (!timeframe) {
        return { error: `Unsupported timeframe: ${requestedTimeframe}` };
      }

      const timeframeDetails = describeMilestoneTimeframe(requestedTimeframe, timeframe, now);

      const { data, error } = await client
        .from('users')
        .select(
          `
          date_of_birth,
          metadata,
          user_tokens ( token )
        `,
        )
        .eq('is_active', true);

      if (error) {
        console.error('[chat:tool:getUpcomingMilestones] Query error', error);
        return { error: error.message };
      }

      const parseMonthDay = (value: unknown): { month: number; day: number } | null => {
        if (typeof value !== 'string') return null;
        const match = value.match(/^(?:\d{4}[-/])?(\d{1,2})[-/](\d{1,2})/);
        if (!match) return null;

        const month = Number(match[1]);
        const day = Number(match[2]);
        if (month < 1 || month > 12 || day < 1 || day > 31) return null;
        return { month, day };
      };

      const getBirthday = (user: (typeof data)[number]) => {
        const birthday = parseMonthDay(user.date_of_birth);
        if (birthday) return birthday;

        if (user.metadata && typeof user.metadata === 'object' && !Array.isArray(user.metadata)) {
          const values = user.metadata as Record<string, unknown>;
          const month = Number(values.dob_month);
          const day = Number(values.dob_day);
          if (Number.isInteger(month) && Number.isInteger(day)) return { month, day };
        }

        return null;
      };

      const getWeddingAnniversary = (user: (typeof data)[number]) => {
        if (!user.metadata || typeof user.metadata !== 'object' || Array.isArray(user.metadata)) {
          return null;
        }
        const values = user.metadata as Record<string, unknown>;
        return parseMonthDay(values.wedanniv_date);
      };

      const results = {
        birthdays: { count: 0, tokens: [] as string[] },
        wedding_anniversaries: { count: 0, tokens: [] as string[] },
      };

      const getToken = (user: (typeof data)[number]) => {
        const tokens = user.user_tokens;
        if (Array.isArray(tokens)) return tokens[0]?.token;
        return (tokens as { token?: string })?.token;
      };

      for (const user of data) {
        const token = getToken(user);
        const milestones: [Milestone, ReturnType<typeof getBirthday>][] = [
          ['birthday', getBirthday(user)],
          ['wedding_anniversary', getWeddingAnniversary(user)],
        ];

        for (const [type, date] of milestones) {
          if (!date || !isMonthDayInTimeframe(date.month, date.day, timeframe, now)) continue;
          const result = results[type === 'birthday' ? 'birthdays' : 'wedding_anniversaries'];
          result.count += 1;
          if (token) result.tokens.push(token);
        }
      }

      console.log('[chat:tool:getUpcomingMilestones] Filter results', {
        requestId,
        timeframe,
        userCount: data.length,
        birthdayCount: results.birthdays.count,
        weddingAnniversaryCount: results.wedding_anniversaries.count,
        totalCount: results.birthdays.count + results.wedding_anniversaries.count,
      });

      return {
        timeframe: timeframeDetails,
        ...results,
        total_count: results.birthdays.count + results.wedding_anniversaries.count,
      };
    },
  });
}
