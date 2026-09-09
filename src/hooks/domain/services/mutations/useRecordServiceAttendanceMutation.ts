import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateServiceAttendanceInput, ServiceAttendance } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

export function useRecordServiceAttendanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateServiceAttendanceInput): Promise<ServiceAttendance> => {
      const { data, error } = await supabase
        .from('service_attendance')
        .insert({
          user_id: input.user_id,
          rfid: input.rfid ?? null,
          service_date: input.service_date,
          time_slot: input.time_slot,
          checked_in_at: input.checked_in_at ?? new Date().toISOString(),
          is_walk_in: input.is_walk_in ?? false,
          is_override: input.is_override ?? false,
          is_manual_entry: input.is_manual_entry ?? false,
          service_seat_id: input.service_seat_id ?? null,
          metadata: input.metadata ?? {},
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to record service attendance: ${error.message}`);
      }

      return data as ServiceAttendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance'] });
    },
  });
}
