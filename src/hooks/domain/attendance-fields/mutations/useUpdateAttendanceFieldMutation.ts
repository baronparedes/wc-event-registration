import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import {
  type AttendanceField,
  type UpdateAttendanceFieldInput,
  updateAttendanceField,
} from '@/lib/domain/attendance-fields';

/** Updates an existing attendance field via PostgREST. */
export function useUpdateAttendanceFieldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAttendanceFieldInput): Promise<AttendanceField> =>
      updateAttendanceField(input),
    onSuccess: (_field, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceFields(variables.event_id),
      });
    },
  });
}
