import { tool } from 'npm:ai@latest';
import { z } from 'npm:zod';

import { getPhNow } from './timeframes.ts';
import type { ToolContext } from './types.ts';

export function createAnalyzeEventAttendeesTool({ client, requestId }: ToolContext) {
  const schema = z.object({
    eventId: z.string().describe('The UUID of the event to analyze'),
    includeDynamicFields: z
      .boolean()
      .default(false)
      .describe(
        'Whether to fetch and aggregate custom dynamic field answers from registrations. Set to true only if the user explicitly asks about specific answers or fields.',
      ),
  });

  return tool({
    description:
      'Analyze the attendees of a specific event. Returns demographics (age, gender), registration status counts (confirmed/cancelled), check-in counts, and optionally summarizes custom dynamic field answers (e.g. meal preference, t-shirt size).',
    parameters: schema,
    execute: async ({ eventId, includeDynamicFields }) => {
      console.log('[chat:tool:analyzeEventAttendees] Executing', {
        eventId,
        includeDynamicFields,
        requestId,
      });

      // 1. Fetch member registrations & user demographics
      const { data: memberRegs, error: memberErr } = await client
        .from('registrations')
        .select('status, users(date_of_birth, metadata)')
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
      }

      for (const reg of publicRegs || []) {
        if (reg.status === 'submitted') statusCounts.public.submitted++;
        else if (reg.status === 'cancelled') statusCounts.public.cancelled++;
        else statusCounts.public.other++;
      }

      const totalMemberRegistrations = (memberRegs || []).length;
      const totalPublicRegistrations = (publicRegs || []).length;
      const totalRegistrations = totalMemberRegistrations + totalPublicRegistrations;

      // 4. Optionally fetch and aggregate dynamic fields
      let dynamicFieldSummary: Record<string, Record<string, number>> | undefined = undefined;

      if (includeDynamicFields) {
        dynamicFieldSummary = {};

        // Fetch fields to know their labels
        const { data: fields } = await client
          .from('event_fields')
          .select('id, label, field_type')
          .eq('event_id', eventId)
          .eq('is_active', true);

        if (fields && fields.length > 0) {
          // Fetch member answers
          // join with registrations to make sure we only count the right event,
          // though event_field_id technically already implies the event.
          const { data: memberAnswers } = await client
            .from('registration_answers')
            .select(
              'event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json, registrations!inner(event_id)',
            )
            .eq('registrations.event_id', eventId);

          const { data: publicAnswers } = await client
            .from('public_registration_answers')
            .select(
              'event_field_id, answer_text, answer_number, answer_boolean, answer_date, answer_json, public_registrations!inner(event_id)',
            )
            .eq('public_registrations.event_id', eventId);

          const allAnswers = [...(memberAnswers || []), ...(publicAnswers || [])];

          for (const field of fields) {
            dynamicFieldSummary[field.label] = {};
            const answersForField = allAnswers.filter((a) => a.event_field_id === field.id);

            for (const ans of answersForField) {
              // Extract the value as a string for aggregation counting
              let valStr = 'unanswered';
              if (ans.answer_text !== null) valStr = ans.answer_text;
              else if (ans.answer_number !== null) valStr = String(ans.answer_number);
              else if (ans.answer_boolean !== null) valStr = String(ans.answer_boolean);
              else if (ans.answer_date !== null) valStr = String(ans.answer_date);
              else if (ans.answer_json !== null) {
                if (Array.isArray(ans.answer_json)) {
                  // For multi-selects, we can either count each option or the combo
                  // Let's count each individual option selected
                  ans.answer_json.forEach((item: unknown) => {
                    const strItem = String(item);
                    dynamicFieldSummary![field.label][strItem] =
                      (dynamicFieldSummary![field.label][strItem] || 0) + 1;
                  });
                  continue; // skip the general assignment below
                } else {
                  valStr = JSON.stringify(ans.answer_json);
                }
              }

              dynamicFieldSummary[field.label][valStr] =
                (dynamicFieldSummary[field.label][valStr] || 0) + 1;
            }
          }
        }
      }

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
        },
        dynamicFields: dynamicFieldSummary,
      };
    },
  });
}
