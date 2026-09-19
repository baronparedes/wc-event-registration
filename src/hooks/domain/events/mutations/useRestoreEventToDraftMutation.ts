import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

import { adminEventQueryKey } from '../queries/useAdminEventQuery';
import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery';

/** Moves an archived event back to draft status. */
export function useRestoreEventToDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('events').update({ status: 'draft' }).eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey(id) });
    },
  });
}
