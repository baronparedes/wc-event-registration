import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { DeleteAttendanceFieldInput } from '@/lib/domain/attendance-fields';
import { supabase } from '@/lib/infrastructure';

/** Deletes an attendance field (cascade removes its answers) via PostgREST. */
export function useDeleteAttendanceFieldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteAttendanceFieldInput): Promise<void> => {
      const { error } = await supabase
        .from('attendance_fields')
        .delete()
        .eq('id', input.id)
        .eq('event_id', input.event_id);

      if (error) throw error;
    },
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
