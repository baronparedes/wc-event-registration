import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import {
  type ReorderAttendanceFieldsInput,
  reorderAttendanceFields,
} from '@/lib/domain/attendance-fields';

/** Reorders attendance fields by updating display_order for each field via RPC. */
export function useReorderAttendanceFieldsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderAttendanceFieldsInput): Promise<void> =>
      reorderAttendanceFields(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceFields(variables.event_id),
      });
    },
  });
}
