import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ReorderEventFieldsInput } from '@/lib/domain/event-fields';
import { supabase } from '@/lib/infrastructure';

import { adminEventFieldsQueryKey } from '../queries/useAdminEventFieldsQuery';

/**
 * Reorders event fields by updating display_order for each field.
 * Only permitted on draft events.
 * orderedIds must contain the full list of field IDs in the desired order.
 */
export function useReorderEventFieldsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderEventFieldsInput): Promise<void> => {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('status')
        .eq('id', input.event_id)
        .single();

      if (eventError) throw eventError;

      if (event.status !== 'draft') {
        throw new Error(
          'Cannot reorder fields on a published or archived event. Archive this event and create a new one to change the registration form.',
        );
      }

      const upsertRows = input.orderedIds.map((id, index) => ({
        id,
        event_id: input.event_id,
        display_order: index,
      }));

      const { error } = await supabase.from('event_fields').upsert(upsertRows, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminEventFieldsQueryKey(variables.event_id) });
    },
  });
}
