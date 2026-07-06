import { useMutation, useQueryClient } from '@tanstack/react-query';

import { writeAdminAuditLogSafely } from '@/lib/domain/admin-audit';
import { supabase } from '@/lib/infrastructure';

import { adminEventQueryKey } from '../queries/useAdminEventQuery';
import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery';

/** Moves an archived event back to draft status. */
export function useRestoreEventToDraftMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data: event } = await supabase
        .from('events')
        .select('status')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase.from('events').update({ status: 'draft' }).eq('id', id);

      if (error) throw error;

      await writeAdminAuditLogSafely({
        action: 'update_event',
        resourceType: 'event',
        resourceId: id,
        metadata: {
          previous_status: event?.status ?? null,
          next_status: 'draft',
        },
      });
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: adminEventQueryKey(id) });
    },
  });
}
