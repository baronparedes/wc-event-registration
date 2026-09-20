import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { describeDateRange, isMonthDayInRange, resolveDateRange } from './timeframes.ts';
import type { ToolContext } from './types.ts';

type Milestone = 'birthday' | 'wedding_anniversary';

export function createGetUpcomingMilestonesTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    targetStartDate: z
      .string()
      .optional()
      .describe(
        'Start of the date range in YYYY-MM-DD format. Resolve any natural-language timeframe (e.g. "this week", "next month") to a concrete date before calling this tool.',
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
      'Retrieve birthdays and wedding anniversaries as separate counts with user tokens within the specified date range. Defaults to the current month when no dates are provided. This tool NEVER returns PII like names or emails.',
    parameters: schema,
    execute: async ({ targetStartDate, targetEndDate }) => {
      const now = new Date();
      const range = resolveDateRange(targetStartDate, targetEndDate, 'this_month', now);

      console.log('[chat:tool:getUpcomingMilestones] Executing', {
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

      const timeframeDetails = describeDateRange(range);

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
          if (!date || !isMonthDayInRange(date.month, date.day, range)) continue;
          const result = results[type === 'birthday' ? 'birthdays' : 'wedding_anniversaries'];
          result.count += 1;
          if (token) result.tokens.push(token);
        }
      }

      console.log('[chat:tool:getUpcomingMilestones] Filter results', {
        requestId,
        resolvedRange: timeframeDetails,
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
