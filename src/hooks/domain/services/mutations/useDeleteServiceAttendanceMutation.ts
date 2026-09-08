import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export function useDeleteServiceAttendanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('service_attendance').delete().eq('id', id);

      if (error) {
        throw new Error(`Failed to delete service attendance record: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance'] });
    },
  });
}
