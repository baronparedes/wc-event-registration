import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type ServiceLayout,
  type UpdateServiceLayoutInput,
  updateServiceLayout,
} from '@/lib/domain/services';

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
      return updateServiceLayout(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICE_LAYOUTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ACTIVE_SERVICE_LAYOUT_QUERY_KEY });
    },
  });
}
