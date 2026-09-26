import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import {
  type AttendanceField,
  type CreateAttendanceFieldInput,
  createAttendanceField,
} from '@/lib/domain/attendance-fields';

/** Creates a new attendance field via PostgREST. Automatically sets display_order to one beyond the current maximum. */
export function useCreateAttendanceFieldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAttendanceFieldInput): Promise<AttendanceField> =>
      createAttendanceField(input),
    onSuccess: (_field, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceFields(variables.event_id),
      });
    },
  });
}
