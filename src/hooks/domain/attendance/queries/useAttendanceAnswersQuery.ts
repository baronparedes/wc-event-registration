import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { RegistrantAttendanceRow } from '@/lib/domain/attendance';
import { supabase } from '@/lib/infrastructure';

/**
 * Fetches all registrants for an event with their attendance field answers.
 * Used in the admin attendance data entry list.
 */
export function useAttendanceAnswersQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceAnswers(eventId),
    queryFn: async (): Promise<RegistrantAttendanceRow[]> => {
      if (!eventId) return [];

      const { data: registrations, error: regError } = await supabase
        .from('registrations')
        .select('id, user_id')
        .eq('event_id', eventId);

      if (regError) throw regError;
      if (!registrations || registrations.length === 0) return [];

      const userIds = registrations.map((r) => r.user_id as string);

      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, member_id, full_name, email')
        .in('id', userIds)
        .order('full_name', { ascending: true });

      if (userError) throw userError;

      const registrationIds = registrations.map((r) => r.id as string);

      const { data: answers, error: answersError } = await supabase
        .from('attendance_answers')
        .select(
          'id, registration_id, attendance_field_id, answer_text, answer_number, created_at, updated_at',
        )
        .in('registration_id', registrationIds);

      if (answersError) throw answersError;

      const regByUserId = new Map(registrations.map((r) => [r.user_id as string, r.id as string]));

      return (users ?? []).map((user) => {
        const registrationId = regByUserId.get(user.id as string)!;
        return {
          registration_id: registrationId,
          member_id: user.member_id as string,
          full_name: user.full_name as string,
          email: (user.email as string | null) ?? null,
          answers: (answers ?? []).filter((a) => a.registration_id === registrationId),
        };
      });
    },
    enabled: Boolean(eventId),
  });
}
