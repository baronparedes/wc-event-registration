import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { ReorderAttendanceFieldsInput } from '@/lib/domain/attendance-fields';
import { supabase } from '@/lib/infrastructure';

/** Reorders attendance fields by updating display_order for each field via RPC. */
export function useReorderAttendanceFieldsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderAttendanceFieldsInput): Promise<void> => {
      const { error } = await supabase.rpc('reorder_attendance_fields', {
        p_event_id: input.event_id,
        p_ordered_ids: input.orderedIds,
      });

      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceFields(variables.event_id),
      });
    },
  });
}
