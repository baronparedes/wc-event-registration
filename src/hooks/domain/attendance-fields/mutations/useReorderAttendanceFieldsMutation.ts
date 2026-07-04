import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { ReorderAttendanceFieldsInput } from '@/lib/domain/attendance-fields';
import { supabase } from '@/lib/infrastructure';

/** Reorders attendance fields by updating display_order for each field via PostgREST. */
export function useReorderAttendanceFieldsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderAttendanceFieldsInput): Promise<void> => {
      const results = await Promise.all(
        input.orderedIds.map((id, index) =>
          supabase
            .from('attendance_fields')
            .update({ display_order: index })
            .eq('id', id)
            .eq('event_id', input.event_id),
        ),
      );

      // Check for errors in any of the results
      for (const result of results) {
        if (result.error) throw result.error;
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceFields(variables.event_id),
      });
    },
  });
}
