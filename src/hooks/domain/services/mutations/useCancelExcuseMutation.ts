import { useMutation, useQueryClient } from '@tanstack/react-query';

import { cancelServiceExcuse } from '@/lib/domain/services';

export function useCancelExcuseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      return cancelServiceExcuse(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-excused-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['service-excuse-requests'] });
      queryClient.invalidateQueries({ queryKey: ['commitment-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['missed-service-commitments'] });
      queryClient.invalidateQueries({ queryKey: ['volunteer-attendance-log'] });
    },
  });
}
