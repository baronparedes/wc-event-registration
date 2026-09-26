import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteServiceAttendance } from '@/lib/domain/services';

export function useDeleteServiceAttendanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await deleteServiceAttendance(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance'] });
    },
  });
}
