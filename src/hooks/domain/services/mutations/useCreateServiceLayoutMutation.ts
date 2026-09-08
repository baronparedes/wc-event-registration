import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { CreateServiceLayoutInput, ServiceLayout } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

import { ACTIVE_SERVICE_LAYOUT_QUERY_KEY } from '../queries/useActiveServiceLayoutQuery';
import { SERVICE_LAYOUTS_QUERY_KEY } from '../queries/useServiceLayoutsQuery';

export function useCreateServiceLayoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateServiceLayoutInput): Promise<ServiceLayout> => {
      const { data, error } = await supabase
        .from('service_layouts')
        .insert({
          description: input.description,
          is_active: input.is_active ?? true,
          metadata: input.metadata ?? {},
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create service layout: ${error.message}`);
      }

      return data as ServiceLayout;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_LAYOUTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_SERVICE_LAYOUT_QUERY_KEY });
    },
  });
}
