import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { AttendanceField, UpdateAttendanceFieldInput } from '@/lib/domain/attendance-fields';
import { supabase } from '@/lib/infrastructure';

/** Updates an existing attendance field via PostgREST. */
export function useUpdateAttendanceFieldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateAttendanceFieldInput): Promise<AttendanceField> => {
      const { id, event_id, ...updates } = input;

      const { data, error } = await supabase
        .from('attendance_fields')
        .update(updates)
        .eq('id', id)
        .eq('event_id', event_id)
        .select()
        .single();

      if (error) throw error;
      return data as AttendanceField;
    },
    onSuccess: (_field, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceFields(variables.event_id),
      });
    },
  });
}
