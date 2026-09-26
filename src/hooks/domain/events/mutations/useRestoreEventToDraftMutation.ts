import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { updateEventStatus } from '@/lib/domain/events';

import { adminEventQueryKey } from '../queries/useAdminEventQuery';
import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery';

/** Moves an archived event back to draft status. */
export function useRestoreEventToDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await updateEventStatus(id, 'draft');
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.publicEventListing() });
      queryClient.invalidateQueries({ queryKey: ['public-event-by-slug'] });
    },
  });
}
