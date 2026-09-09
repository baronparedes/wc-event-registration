import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ServiceLayout, UpdateServiceLayoutInput } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

import { ACTIVE_SERVICE_LAYOUT_QUERY_KEY } from '../queries/useActiveServiceLayoutQuery';
import { SERVICE_LAYOUTS_QUERY_KEY } from '../queries/useServiceLayoutsQuery';

export function useUpdateServiceLayoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateServiceLayoutInput;
    }): Promise<ServiceLayout> => {
      const { data, error } = await supabase
        .from('service_layouts')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update service layout: ${error.message}`);
      }

      return data as ServiceLayout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_LAYOUTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_SERVICE_LAYOUT_QUERY_KEY });
    },
  });
}
