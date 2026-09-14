import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import type { ToolContext } from './types.ts';

export function createGetUserDemographicsTool({ client, requestId }: ToolContext) {
  const schema = z.object({});

  return tool({
    description:
      'Retrieve demographic statistics of the user base, such as age distribution. This tool NEVER returns PII like names or emails.',
    parameters: schema,
    execute: async () => {
      console.log('[chat:tool:getUserDemographics] Executing', { requestId });

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
        console.error('[chat:tool:getUserDemographics] Query error', error);
        return { error: error.message };
      }

      const now = new Date();
      const ageDistribution = {
        '0-17': { count: 0, tokens: [] as string[] },
        '18-24': { count: 0, tokens: [] as string[] },
        '25-34': { count: 0, tokens: [] as string[] },
        '35-44': { count: 0, tokens: [] as string[] },
        '45-54': { count: 0, tokens: [] as string[] },
        '55+': { count: 0, tokens: [] as string[] },
      };

      for (const user of data) {
        if (!user.date_of_birth) continue;
        const dob = new Date(user.date_of_birth);
        let age = now.getFullYear() - dob.getFullYear();
        const m = now.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
          age--;
        }

        const tokensArray = user.user_tokens;
        const token: string | undefined = Array.isArray(tokensArray)
          ? tokensArray[0]?.token
          : (tokensArray as { token?: string })?.token;

        let group = '55+';
        if (age <= 17) group = '0-17';
        else if (age <= 24) group = '18-24';
        else if (age <= 34) group = '25-34';
        else if (age <= 44) group = '35-44';
        else if (age <= 54) group = '45-54';

        ageDistribution[group as keyof typeof ageDistribution].count++;
        if (token) {
          ageDistribution[group as keyof typeof ageDistribution].tokens.push(token);
        }
      }

      return {
        total_users_with_age: data.length,
        age_distribution: ageDistribution,
      };
    },
  });
}
