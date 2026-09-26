import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type CreateServiceLayoutInput,
  type ServiceLayout,
  createServiceLayout,
} from '@/lib/domain/services';

import { ACTIVE_SERVICE_LAYOUT_QUERY_KEY } from '../queries/useActiveServiceLayoutQuery';
import { SERVICE_LAYOUTS_QUERY_KEY } from '../queries/useServiceLayoutsQuery';

export function useCreateServiceLayoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateServiceLayoutInput): Promise<ServiceLayout> => {
      return createServiceLayout(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_LAYOUTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_SERVICE_LAYOUT_QUERY_KEY });
    },
  });
}
