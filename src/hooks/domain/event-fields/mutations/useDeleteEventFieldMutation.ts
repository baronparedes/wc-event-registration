import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deleteEventField, fetchEventFieldEventStatus } from '@/lib/domain/event-fields';

import { adminEventFieldsQueryKey } from '../queries/useAdminEventFieldsQuery';

type DeleteEventFieldInput = {
  fieldId: string;
  eventId: string;
};

/**
 * Deletes an event field. Only permitted on draft events.
 */
export function useDeleteEventFieldMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fieldId, eventId }: DeleteEventFieldInput): Promise<void> => {
      const status = await fetchEventFieldEventStatus(eventId);

      if (status !== 'draft') {
        throw new Error(
          'Cannot delete fields from a published or archived event. Archive this event and create a new one to change the registration form.',
        );
      }

      await deleteEventField(fieldId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: adminEventFieldsQueryKey(variables.eventId) });
    },
  });
}
