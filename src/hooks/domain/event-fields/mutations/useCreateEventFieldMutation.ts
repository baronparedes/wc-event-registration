import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createEventField, fetchEventFieldEventStatus } from '@/lib/domain/event-fields';
import type { AdminEventField, CreateEventFieldInput } from '@/lib/domain/event-fields';

import { adminEventFieldsQueryKey } from '../queries/useAdminEventFieldsQuery';

/**
 * Creates a new event field. Only permitted on draft events.
 * Automatically sets display_order to one beyond the current maximum.
 */
export function useCreateEventFieldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateEventFieldInput): Promise<AdminEventField> => {
      const status = await fetchEventFieldEventStatus(input.event_id);

      if (status !== 'draft') {
        throw new Error(
          'Cannot add fields to a published or archived event. Archive this event and create a new one to change the registration form.',
        );
      }

      return createEventField(input);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminEventFieldsQueryKey(variables.event_id) });
    },
  });
}
