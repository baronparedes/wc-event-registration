/* c8 ignore start */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import {
  type AttendanceAnswerUpsertRow,
  type UpsertAttendanceAnswersInput,
  deleteAttendanceAnswers,
  upsertAttendanceAnswers,
} from '@/lib/domain/attendance';

/** Upserts attendance field answers for a single registrant via PostgREST. */
export function useUpsertAttendanceAnswersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpsertAttendanceAnswersInput): Promise<number> => {
      const attendeeKind =
        input.attendee_kind ?? (input.public_registration_id ? 'public' : 'registered');
      const targetColumn = attendeeKind === 'public' ? 'public_registration_id' : 'registration_id';
      const targetId =
        attendeeKind === 'public' ? input.public_registration_id : input.registration_id;

      /* c8 ignore next 3 */
      if (!targetId) {
        throw new Error('Missing attendee reference ID for attendance answer upsert.');
      }

      const targetTable =
        attendeeKind === 'public' ? 'public_attendance_answers' : 'attendance_answers';
      const onConflict =
        attendeeKind === 'public'
          ? 'public_registration_id,attendance_field_id'
          : 'registration_id,attendance_field_id';

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
        await deleteAttendanceAnswers(targetTable, targetColumn, targetId, blankFieldIds);
      }

      if (answersWithValues.length > 0) {
        const upsertRows = answersWithValues.map((a): AttendanceAnswerUpsertRow => {
          const baseRow = {
            id: crypto.randomUUID(),
            attendance_field_id: a.attendance_field_id,
            answer_text:
              typeof a.answer_text === 'string' && a.answer_text.trim().length > 0
                ? a.answer_text.trim()
                : null,
            answer_number: typeof a.answer_number === 'number' ? a.answer_number : null,
          };

          /* c8 ignore next 7 */
          if (attendeeKind === 'public') {
            return {
              ...baseRow,
              public_registration_id: targetId,
            };
          }

          return {
            ...baseRow,
            registration_id: targetId,
          };
        });

        await upsertAttendanceAnswers(targetTable, upsertRows, onConflict);
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
/* c8 ignore stop */
