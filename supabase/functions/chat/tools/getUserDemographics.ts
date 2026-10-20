import { tool } from 'ai';
import { z } from 'chat-zod';

import { getPrimaryRole, isSpecificRole, matchesPrimaryRole } from './roles.ts';
import { getPhNow } from './timeframes.ts';
import type { ToolContext } from './types.ts';

function getToken(userTokens: unknown): string | undefined {
  if (!userTokens) return undefined;
  if (Array.isArray(userTokens)) return userTokens[0]?.token;
  return (userTokens as { token?: string })?.token;
}

function calculateAge(dateOfBirth: unknown, now: Date): number | null {
  if (!dateOfBirth) return null;
  const dobStr = String(dateOfBirth).split('T')[0];
  const [dobYear, dobMonth, dobDay] = dobStr.split('-').map(Number);
  if (!dobYear || !dobMonth || !dobDay) return null;
  let years = now.getFullYear() - dobYear;
  const monthDiff = now.getMonth() + 1 - dobMonth;
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dobDay)) years--;
  return years;
}

export function createGetUserDemographicsTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    role: z.string().trim().optional().describe('Filter by primary role (e.g. "usher")'),
    minAge: z.number().int().min(0).optional().describe('Min age (inclusive)'),
    maxAge: z.number().int().min(0).optional().describe('Max age (inclusive)'),
    gender: z.enum(['men', 'ladies']).optional().describe('Gender filter: "men" or "ladies"'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(200)
      .optional()
      .describe('Max matching volunteers (default 50)'),
  });

  return tool({
    description: 'Retrieve volunteer demographics or specific age/gender cohorts.',
    inputSchema: schema,
    execute: async ({ role, minAge, maxAge, gender, limit = 50 }) => {
      console.log('[chat:tool:getUserDemographics] Executing', {
        role,
        minAge,
        maxAge,
        gender,
        limit,
        requestId,
      });

      const isTargetedLookup = minAge !== undefined || maxAge !== undefined || gender !== undefined;

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
      const totalUsers = data.length;

      const now = getPhNow();
      const ageDistribution: Record<string, { count: number; percentage: number }> = {
        '0-17': { count: 0, percentage: 0 },
        '18-24': { count: 0, percentage: 0 },
        '25-34': { count: 0, percentage: 0 },
        '35-44': { count: 0, percentage: 0 },
        '45-54': { count: 0, percentage: 0 },
        '55+': { count: 0, percentage: 0 },
      };

      const genderDistribution: Record<string, { count: number; percentage: number }> = {
        men: { count: 0, percentage: 0 },
        ladies: { count: 0, percentage: 0 },
        unspecified: { count: 0, percentage: 0 },
      };

      const roleBreakdown = new Map<
        string,
        {
          count: number;
          percentage: number;
          gender_breakdown: { men: number; ladies: number; unspecified: number };
          age_distribution: Record<string, number>;
        }
      >();

      const createAgeCounts = () => ({
        '0-17': 0,
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55+': 0,
      });

      const getGender = (metadata: unknown): 'men' | 'ladies' | 'unspecified' => {
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

      const matchingVolunteers: Array<{
        token: string;
        role: string;
        age: number | null;
        gender: 'men' | 'ladies' | 'unspecified';
      }> = [];

      for (const user of data) {
        const userGender = getGender(user.metadata);
        genderDistribution[userGender].count++;

        const roleName = getPrimaryRole(user.role);
        let roleEntry = roleBreakdown.get(roleName);
        if (!roleEntry) {
          roleEntry = {
            count: 0,
            percentage: 0,
            gender_breakdown: { men: 0, ladies: 0, unspecified: 0 },
            age_distribution: createAgeCounts(),
          };
          roleBreakdown.set(roleName, roleEntry);
        }
        roleEntry.count++;
        roleEntry.gender_breakdown[userGender]++;

        const userAge = calculateAge(user.date_of_birth, now);

        if (userAge !== null) {
          let group = '55+';
          if (userAge <= 17) group = '0-17';
          else if (userAge <= 24) group = '18-24';
          else if (userAge <= 34) group = '25-34';
          else if (userAge <= 44) group = '35-44';
          else if (userAge <= 54) group = '45-54';

          ageDistribution[group].count++;
          roleEntry.age_distribution[group]++;
        }

        if (isTargetedLookup) {
          if (gender !== undefined && userGender !== gender) continue;
          if (minAge !== undefined && (userAge === null || userAge < minAge)) continue;
          if (maxAge !== undefined && (userAge === null || userAge > maxAge)) continue;

          const token = getToken(user.user_tokens) || 'UNKNOWN';
          matchingVolunteers.push({
            token,
            role: roleName,
            age: userAge,
            gender: userGender,
          });
        }
      }

      if (isTargetedLookup && (minAge !== undefined || maxAge !== undefined)) {
        matchingVolunteers.sort((a, b) => (a.age ?? 999) - (b.age ?? 999));
      }

      // Compute percentages
      if (totalUsers > 0) {
        for (const key of Object.keys(ageDistribution)) {
          ageDistribution[key].percentage = Math.round(
            (ageDistribution[key].count / totalUsers) * 100,
          );
        }
        for (const key of Object.keys(genderDistribution)) {
          genderDistribution[key].percentage = Math.round(
            (genderDistribution[key].count / totalUsers) * 100,
          );
        }
        for (const entry of roleBreakdown.values()) {
          entry.percentage = Math.round((entry.count / totalUsers) * 100);
        }
      }

      const usersWithBirthday = data.filter((u) => Boolean(u.date_of_birth)).length;

      const response: Record<string, unknown> = {
        total_users: totalUsers,
        total_users_with_birthday: usersWithBirthday,
        total_users_without_birthday: totalUsers - usersWithBirthday,
        age_distribution: ageDistribution,
        gender_breakdown: genderDistribution,
        role_breakdown: Object.fromEntries(roleBreakdown),
      };

      if (isTargetedLookup) {
        response.total_matching = matchingVolunteers.length;
        response.has_more = matchingVolunteers.length > limit;
        response.matching_volunteers = matchingVolunteers.slice(0, limit);
        response.filters_applied = {
          minAge,
          maxAge,
          gender,
          role,
          limit,
        };
      }

      return response;
    },
  });
}
