import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import type { ToolContext } from './types.ts';

export function createGetUserDemographicsTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    role: z
      .string()
      .trim()
      .optional()
      .describe('Optional role filter, such as "volunteer" or "usher".'),
  });

  return tool({
    description:
      'Retrieve aggregate volunteer demographics, including role and gender breakdowns (men or ladies) and age distribution. This tool NEVER returns PII like names or emails.',
    parameters: schema,
    execute: async ({ role }) => {
      console.log('[chat:tool:getUserDemographics] Executing', { role, requestId });

      let query = client
        .from('users')
        .select('role, date_of_birth, metadata, user_tokens ( token )');
      if (role) query = query.ilike('role', `%${role}%`);

      const { data, error } = await query;

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

      const genderDistribution = {
        men: { count: 0, tokens: [] as string[] },
        ladies: { count: 0, tokens: [] as string[] },
        unspecified: { count: 0, tokens: [] as string[] },
      };

      const roleBreakdown = new Map<
        string,
        {
          count: number;
          tokens: string[];
          gender_breakdown: typeof genderDistribution;
          age_distribution: typeof ageDistribution;
        }
      >();

      const createAgeDistribution = () => ({
        '0-17': { count: 0, tokens: [] as string[] },
        '18-24': { count: 0, tokens: [] as string[] },
        '25-34': { count: 0, tokens: [] as string[] },
        '35-44': { count: 0, tokens: [] as string[] },
        '45-54': { count: 0, tokens: [] as string[] },
        '55+': { count: 0, tokens: [] as string[] },
      });

      const getToken = (user: (typeof data)[number]) => {
        const tokens = user.user_tokens;
        if (Array.isArray(tokens)) return tokens[0]?.token;
        return (tokens as { token?: string })?.token;
      };

      const getGender = (metadata: unknown): keyof typeof genderDistribution => {
        const values = metadata as Record<string, unknown> | null;
        const rawGender = values?.gender ?? values?.sex;
        if (typeof rawGender !== 'string') return 'unspecified';
        const normalized = rawGender.trim().toLowerCase();
        if (['male', 'man', 'men', 'm'].includes(normalized)) return 'men';
        if (['female', 'woman', 'women', 'lady', 'ladies', 'f'].includes(normalized)) {
          return 'ladies';
        }
        return 'unspecified';
      };

      for (const user of data) {
        const token = getToken(user);
        const gender = getGender(user.metadata);
        genderDistribution[gender].count++;
        if (token) genderDistribution[gender].tokens.push(token);

        const roleName =
          typeof user.role === 'string' && user.role.trim() ? user.role.trim() : 'Unspecified';
        const roleEntry = roleBreakdown.get(roleName) ?? {
          count: 0,
          tokens: [],
          gender_breakdown: {
            men: { count: 0, tokens: [] },
            ladies: { count: 0, tokens: [] },
            unspecified: { count: 0, tokens: [] },
          },
          age_distribution: createAgeDistribution(),
        };
        roleEntry.count++;
        if (token) roleEntry.tokens.push(token);
        roleEntry.gender_breakdown[gender].count++;
        if (token) roleEntry.gender_breakdown[gender].tokens.push(token);
        roleBreakdown.set(roleName, roleEntry);

        if (!user.date_of_birth) continue;
        const dob = new Date(user.date_of_birth);
        let age = now.getFullYear() - dob.getFullYear();
        const monthDifference = now.getMonth() - dob.getMonth();
        if (monthDifference < 0 || (monthDifference === 0 && now.getDate() < dob.getDate())) age--;

        let group = '55+';
        if (age <= 17) group = '0-17';
        else if (age <= 24) group = '18-24';
        else if (age <= 34) group = '25-34';
        else if (age <= 44) group = '35-44';
        else if (age <= 54) group = '45-54';
        ageDistribution[group as keyof typeof ageDistribution].count++;
        if (token) ageDistribution[group as keyof typeof ageDistribution].tokens.push(token);
        roleEntry.age_distribution[group as keyof typeof roleEntry.age_distribution].count++;
        if (token)
          roleEntry.age_distribution[group as keyof typeof roleEntry.age_distribution].tokens.push(
            token,
          );
      }

      return {
        total_users: data.length,
        total_users_with_age: data.filter((user) => Boolean(user.date_of_birth)).length,
        age_distribution: ageDistribution,
        gender_breakdown: genderDistribution,
        role_breakdown: Object.fromEntries(roleBreakdown),
      };
    },
  });
}
