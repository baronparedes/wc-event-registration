import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteServiceSeat } from '@/lib/domain/services';

export function useDeleteServiceSeatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await deleteServiceSeat(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-seats'] });
    },
  });
}
