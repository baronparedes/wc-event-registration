import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type CreateServiceSeatInput,
  type ServiceSeat,
  createServiceSeat,
} from '@/lib/domain/services';

export function useCreateServiceSeatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateServiceSeatInput): Promise<ServiceSeat> => {
      return createServiceSeat(input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-seats', variables.layout_id] });
    },
  });
}
