import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export function useDeleteServiceSeatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('service_seats').delete().eq('id', id);

      if (error) {
        throw new Error(`Failed to delete service seat: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-seats'] });
    },
  });
}
