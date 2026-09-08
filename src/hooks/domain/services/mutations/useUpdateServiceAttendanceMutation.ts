import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ServiceAttendance, UpdateServiceAttendanceInput } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

export function useUpdateServiceAttendanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateServiceAttendanceInput;
    }): Promise<ServiceAttendance> => {
      const { data, error } = await supabase
        .from('service_attendance')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update service attendance: ${error.message}`);
      }

      return data as ServiceAttendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance'] });
    },
  });
}
