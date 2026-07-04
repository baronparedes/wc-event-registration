import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { AttendanceField, CreateAttendanceFieldInput } from '@/lib/domain/attendance-fields';
import { supabase } from '@/lib/infrastructure';

/** Creates a new attendance field via PostgREST. Automatically sets display_order to one beyond the current maximum. */
export function useCreateAttendanceFieldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAttendanceFieldInput): Promise<AttendanceField> => {
      const { data: orderData } = await supabase
        .from('attendance_fields')
        .select('display_order')
        .eq('event_id', input.event_id)
        .order('display_order', { ascending: false })
        .limit(1);

      const nextOrder = ((orderData?.[0]?.display_order as number) ?? -1) + 1;

      const { data, error } = await supabase
        .from('attendance_fields')
        .insert({
          id: crypto.randomUUID(),
          event_id: input.event_id,
          field_key: input.field_key,
          label: input.label,
          field_type: input.field_type,
          is_required: input.is_required,
          display_order: nextOrder,
          options: input.options ?? [],
          validation_rules: input.validation_rules ?? {},
        })
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
