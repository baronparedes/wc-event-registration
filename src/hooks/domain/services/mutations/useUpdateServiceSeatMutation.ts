import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type ServiceSeat,
  type UpdateServiceSeatInput,
  updateServiceSeat,
} from '@/lib/domain/services';

export function useUpdateServiceSeatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateServiceSeatInput;
    }): Promise<ServiceSeat> => {
      return updateServiceSeat(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-seats'] });
    },
  });
}
