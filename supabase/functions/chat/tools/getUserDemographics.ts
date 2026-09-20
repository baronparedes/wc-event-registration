import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { getPrimaryRole, isSpecificRole, matchesPrimaryRole } from './roles.ts';
import type { ToolContext } from './types.ts';

export function createGetUserDemographicsTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    role: z
      .string()
      .trim()
      .optional()
      .describe(
        'Optional role filter, such as "usher" or "prayer coach". Avoid generic words like "volunteer". If a member has multiple roles separated by a slash (e.g., "Primary / Secondary"), only the primary role before the "/" is evaluated; the secondary role is ignored.',
      ),
  });

  return tool({
    description:
      'Retrieve aggregate volunteer demographics, including role and gender breakdowns (men or ladies) and age distribution. Secondary roles (after "/") are ignored for role filtering and grouping; only the primary role (before "/") is evaluated. This tool NEVER returns PII like names or emails.',
    parameters: schema,
    execute: async ({ role }) => {
      console.log('[chat:tool:getUserDemographics] Executing', { role, requestId });

      let query = client
        .from('users')
        .select('role, date_of_birth, metadata, user_tokens ( token )')
        .eq('is_active', true);
      if (isSpecificRole(role)) {
        const cleanRole = getPrimaryRole(role).toLowerCase();
        query = query.ilike('role', `%${cleanRole}%`);
      }

      const { data: rawData, error } = await query;

      if (error) {
        console.error('[chat:tool:getUserDemographics] Query error', error);
        return { error: error.message };
      }

      const data = (rawData || []).filter((user) => matchesPrimaryRole(user.role, role));

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

      const usersWithoutBirthdayTokens: string[] = [];

      for (const user of data) {
        const token = getToken(user);
        const gender = getGender(user.metadata);
        genderDistribution[gender].count++;
        if (token) genderDistribution[gender].tokens.push(token);

        const roleName = getPrimaryRole(user.role);
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

        if (!user.date_of_birth) {
          if (token) usersWithoutBirthdayTokens.push(token);
          continue;
        }
        // Parse as local date parts to avoid UTC timezone shift.
        // "1990-05-15" via new Date() becomes UTC midnight, which in UTC+8
        // shifts the day by -1 and makes birthday boundary checks unreliable.
        const dobStr = String(user.date_of_birth).split('T')[0];
        const [dobYear, dobMonth, dobDay] = dobStr.split('-').map(Number);
        const age = (() => {
          let years = now.getFullYear() - dobYear;
          const monthDiff = now.getMonth() + 1 - dobMonth;
          if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dobDay)) years--;
          return years;
        })();

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

      const usersWithBirthday = data.filter((u) => Boolean(u.date_of_birth)).length;

      return {
        total_users: data.length,
        total_users_with_birthday: usersWithBirthday,
        total_users_without_birthday: data.length - usersWithBirthday,
        users_without_birthday_tokens: usersWithoutBirthdayTokens,
        age_distribution: ageDistribution,
        gender_breakdown: genderDistribution,
        role_breakdown: Object.fromEntries(roleBreakdown),
      };
    },
  });
}
