import { useMutation, useQueryClient } from '@tanstack/react-query';

import { reorderEventFields } from '@/lib/domain/event-fields';
import type { ReorderEventFieldsInput } from '@/lib/domain/event-fields';

import { adminEventFieldsQueryKey } from '../queries/useAdminEventFieldsQuery';

/**
 * Reorders event fields by updating display_order for each field via RPC.
 * Only permitted on draft events.
 * orderedIds must contain the full list of field IDs in the desired order.
 */
export function useReorderEventFieldsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderEventFieldsInput): Promise<void> => {
      await reorderEventFields(input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminEventFieldsQueryKey(variables.event_id) });
    },
  });
}
