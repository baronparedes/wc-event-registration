import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import {
  type DeleteAttendanceFieldInput,
  deleteAttendanceField,
} from '@/lib/domain/attendance-fields';

/** Deletes an attendance field (cascade removes its answers) via PostgREST. */
export function useDeleteAttendanceFieldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteAttendanceFieldInput): Promise<void> =>
      deleteAttendanceField(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceFields(variables.event_id),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceAnswers(variables.event_id),
      });
    },
  });
}
