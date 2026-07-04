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
        .select('id, member_id, full_name, email')
        .eq('event_id', eventId)
        .eq('status', 'registered')
        .order('full_name', { ascending: true });

      if (regError) throw regError;
      if (!registrations || registrations.length === 0) return [];

      const registrationIds = registrations.map((r) => r.id as string);

      const { data: answers, error: answersError } = await supabase
        .from('attendance_answers')
        .select(
          'id, registration_id, attendance_field_id, answer_text, answer_number, created_at, updated_at',
        )
        .in('registration_id', registrationIds);

      if (answersError) throw answersError;

      return registrations.map((reg) => ({
        registration_id: reg.id as string,
        member_id: reg.member_id as string,
        full_name: reg.full_name as string,
        email: (reg.email as string | null) ?? null,
        answers: (answers ?? []).filter((a) => a.registration_id === reg.id),
      }));
    },
    enabled: Boolean(eventId),
  });
}
