import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import type { ToolContext } from './types.ts';

export function createGetUpcomingBirthdaysTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    timeframe: z
      .enum(['this_week', 'this_month', 'next_month', 'today'])
      .default('this_month')
      .describe('The timeframe to find upcoming birthdays.'),
  });

  return tool({
    description:
      'Retrieve a list of user tokens and the total count of users who have birthdays within the specified timeframe. This tool NEVER returns PII like names or emails.',
    parameters: schema,
    execute: async ({ timeframe }) => {
      console.log('[chat:tool:getUpcomingBirthdays] Executing', { timeframe, requestId });

      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentDay = now.getDate();

      const { data, error } = await client
        .from('users')
        .select(
          `
          date_of_birth,
          user_tokens ( token )
        `,
        )
        .not('date_of_birth', 'is', null);

      if (error) {
        console.error('[chat:tool:getUpcomingBirthdays] Query error', error);
        return { error: error.message };
      }

      const filteredUsers = [];

      const getDayOfYear = (date: Date) => {
        const start = new Date(date.getFullYear(), 0, 0);
        const diff = date.getTime() - start.getTime();
        const oneDay = 1000 * 60 * 60 * 24;
        return Math.floor(diff / oneDay);
      };

      const todayDayOfYear = getDayOfYear(now);

      for (const user of data) {
        if (!user.date_of_birth) continue;
        const dob = new Date(user.date_of_birth);
        const dobMonth = dob.getMonth() + 1;
        const dobDay = dob.getDate();

        let include = false;

        if (timeframe === 'today') {
          include = dobMonth === currentMonth && dobDay === currentDay;
        } else if (timeframe === 'this_month') {
          include = dobMonth === currentMonth;
        } else if (timeframe === 'next_month') {
          let nextMonth = currentMonth + 1;
          if (nextMonth > 12) nextMonth = 1;
          include = dobMonth === nextMonth;
        } else if (timeframe === 'this_week') {
          const dobThisYear = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
          const dobDayOfYear = getDayOfYear(dobThisYear);
          // Simple approximation for "this week" (within next 7 days including today)
          // Handle wrap-around for end of year if needed
          let diffDays = dobDayOfYear - todayDayOfYear;
          if (diffDays < 0 && now.getMonth() === 11 && dobThisYear.getMonth() === 0) {
            diffDays += 365; // approximation
          }
          include = diffDays >= 0 && diffDays <= 7;
        }

        if (include) {
          filteredUsers.push(user);
        }
      }

      const tokens = filteredUsers
        .map((u) => {
          const tokensArray = u.user_tokens;
          // Supabase might return an array or object depending on relation
          if (Array.isArray(tokensArray)) {
            return tokensArray[0]?.token;
          }
          return tokensArray?.token;
        })
        .filter(Boolean);

      return {
        count: tokens.length,
        tokens,
      };
    },
  });
}
