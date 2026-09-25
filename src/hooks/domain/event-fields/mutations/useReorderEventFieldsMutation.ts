import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReorderEventFieldsInput } from '@/lib/domain/event-fields';
import { supabase } from '@/lib/infrastructure';

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
      const { error } = await supabase.rpc('reorder_event_fields', {
        p_event_id: input.event_id,
        p_ordered_ids: input.orderedIds,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminEventFieldsQueryKey(variables.event_id) });
    },
  });
}
