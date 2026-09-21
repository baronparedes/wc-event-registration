import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { getPhNow } from './timeframes.ts';
import type { ToolContext } from './types.ts';

export function createAnalyzeEventAttendeesTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    eventId: z.string().describe('The UUID of the event to analyze'),
  });

  return tool({
    description:
      'Analyze the attendees of a specific event. Returns demographics (age, gender, role, category) and registration status counts (confirmed/cancelled) and check-in counts for member registrations.',
    parameters: schema,
    execute: async ({ eventId }) => {
      console.log('[chat:tool:analyzeEventAttendees] Executing', {
        eventId,
        requestId,
      });

      // 1. Fetch member registrations & user demographics
      const { data: memberRegs, error: memberErr } = await client
        .from('registrations')
        .select('status, users(date_of_birth, role, category, metadata)')
        .eq('event_id', eventId);

      if (memberErr) {
        console.error('[chat:tool:analyzeEventAttendees] Member registrations error:', memberErr);
        return { error: 'Failed to fetch member registrations: ' + memberErr.message };
      }

      // 2. Fetch public registrations
      const { data: publicRegs, error: publicErr } = await client
        .from('public_registrations')
        .select('status')
        .eq('event_id', eventId);

      if (publicErr) {
        console.error('[chat:tool:analyzeEventAttendees] Public registrations error:', publicErr);
        return { error: 'Failed to fetch public registrations: ' + publicErr.message };
      }

      // 3. Fetch check-ins
      const { data: checkIns, error: checkInErr } = await client
        .from('attendance_check_ins')
        .select('id')
        .eq('event_id', eventId);

      if (checkInErr) {
        console.error('[chat:tool:analyzeEventAttendees] Check-ins error:', checkInErr);
        return { error: 'Failed to fetch check-ins: ' + checkInErr.message };
      }

      const totalCheckIns = checkIns?.length || 0;

      // --- Aggregation logic ---

      // Demographics for members
      const now = getPhNow();
      const ageDistribution = {
        '0-17': 0,
        '18-24': 0,
        '25-34': 0,
        '35-44': 0,
        '45-54': 0,
        '55+': 0,
        unknown: 0,
      };

      const genderDistribution = {
        men: 0,
        ladies: 0,
        unspecified: 0,
      };

      const roleBreakdown: Record<string, number> = {};
      const categoryBreakdown: Record<string, number> = {};

      const statusCounts = {
        member: { submitted: 0, cancelled: 0, other: 0 },
        public: { submitted: 0, cancelled: 0, other: 0 },
      };

      for (const reg of memberRegs || []) {
        // Status count
        if (reg.status === 'submitted') statusCounts.member.submitted++;
        else if (reg.status === 'cancelled') statusCounts.member.cancelled++;
        else statusCounts.member.other++;

        // Demographics
        const user = Array.isArray(reg.users) ? reg.users[0] : reg.users;
        if (!user) continue;

        // Gender
        const values = user.metadata as Record<string, unknown> | null;
        const rawGender = values?.gender ?? values?.sex;
        if (typeof rawGender === 'string') {
          const normalized = rawGender.trim().toLowerCase();
          if (['male', 'man', 'men', 'm'].includes(normalized)) genderDistribution.men++;
          else if (['female', 'woman', 'women', 'lady', 'ladies', 'f'].includes(normalized))
            genderDistribution.ladies++;
          else genderDistribution.unspecified++;
        } else {
          genderDistribution.unspecified++;
        }

        // Age
        if (user.date_of_birth) {
          const dobStr = String(user.date_of_birth).split('T')[0];
          const [dobYear, dobMonth, dobDay] = dobStr.split('-').map(Number);
          let age = now.getFullYear() - dobYear;
          const monthDiff = now.getMonth() + 1 - dobMonth;
          if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dobDay)) age--;

          if (age <= 17) ageDistribution['0-17']++;
          else if (age <= 24) ageDistribution['18-24']++;
          else if (age <= 34) ageDistribution['25-34']++;
          else if (age <= 44) ageDistribution['35-44']++;
          else if (age <= 54) ageDistribution['45-54']++;
          else ageDistribution['55+']++;
        } else {
          ageDistribution['unknown']++;
        }

        // Role
        const role =
          typeof user.role === 'string' && user.role.trim() ? user.role.trim() : 'unspecified';
        roleBreakdown[role] = (roleBreakdown[role] ?? 0) + 1;

        // Category
        const category =
          typeof user.category === 'string' && user.category.trim()
            ? user.category.trim()
            : 'unspecified';
        categoryBreakdown[category] = (categoryBreakdown[category] ?? 0) + 1;
      }

      for (const reg of publicRegs || []) {
        if (reg.status === 'submitted') statusCounts.public.submitted++;
        else if (reg.status === 'cancelled') statusCounts.public.cancelled++;
        else statusCounts.public.other++;
      }

      const totalMemberRegistrations = (memberRegs || []).length;
      const totalPublicRegistrations = (publicRegs || []).length;
      const totalRegistrations = totalMemberRegistrations + totalPublicRegistrations;

      return {
        summary: {
          totalRegistrations,
          totalCheckIns,
          attendanceRate:
            totalRegistrations > 0
              ? ((totalCheckIns / totalRegistrations) * 100).toFixed(1) + '%'
              : '0%',
        },
        registrationCounts: {
          members: statusCounts.member,
          public: statusCounts.public,
        },
        memberDemographics: {
          age: ageDistribution,
          gender: genderDistribution,
          role: roleBreakdown,
          category: categoryBreakdown,
        },
      };
    },
  });
}
