import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { UpsertAttendanceAnswersInput } from '@/lib/domain/attendance';
import { supabase } from '@/lib/infrastructure';

/** Upserts attendance field answers for a single registrant via PostgREST. */
export function useUpsertAttendanceAnswersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertAttendanceAnswersInput): Promise<number> => {
      const answersWithValues = input.answers.filter((a) => {
        const hasText = typeof a.answer_text === 'string' && a.answer_text.trim().length > 0;
        const hasNumber = typeof a.answer_number === 'number';
        return hasText || hasNumber;
      });

      const blankFieldIds = input.answers
        .filter((a) => {
          const hasText = typeof a.answer_text === 'string' && a.answer_text.trim().length > 0;
          const hasNumber = typeof a.answer_number === 'number';
          return !hasText && !hasNumber;
        })
        .map((a) => a.attendance_field_id);

      if (blankFieldIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('attendance_answers')
          .delete()
          .eq('registration_id', input.registration_id)
          .in('attendance_field_id', blankFieldIds);

        if (deleteError) throw deleteError;
      }

      if (answersWithValues.length > 0) {
        const upsertRows = answersWithValues.map((a) => ({
          id: crypto.randomUUID(),
          registration_id: input.registration_id,
          attendance_field_id: a.attendance_field_id,
          answer_text:
            typeof a.answer_text === 'string' && a.answer_text.trim().length > 0
              ? a.answer_text.trim()
              : null,
          answer_number: typeof a.answer_number === 'number' ? a.answer_number : null,
        }));

        const { error } = await supabase.from('attendance_answers').upsert(upsertRows, {
          onConflict: 'registration_id,attendance_field_id',
          ignoreDuplicates: false,
        });

        if (error) throw error;
      }

      return answersWithValues.length;
    },
    onSuccess: (_updated, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceAnswers(variables.event_id),
      });
    },
  });
}
