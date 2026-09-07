import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateServiceSeatInput, ServiceSeat } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

export function useCreateServiceSeatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateServiceSeatInput): Promise<ServiceSeat> => {
      const { data, error } = await supabase
        .from('service_seats')
        .insert({
          layout_id: input.layout_id,
          table_number: input.table_number,
          area: input.area ?? null,
          seat_number: input.seat_number ?? null,
          metadata: input.metadata ?? {},
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create service seat: ${error.message}`);
      }

      return data as ServiceSeat;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['service-seats', variables.layout_id] });
    },
  });
}
