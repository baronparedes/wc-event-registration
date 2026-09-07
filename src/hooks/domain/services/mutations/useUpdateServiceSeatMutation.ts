import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ServiceSeat, UpdateServiceSeatInput } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

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
      const { data, error } = await supabase
        .from('service_seats')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update service seat: ${error.message}`);
      }

      return data as ServiceSeat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-seats'] });
    },
  });
}
