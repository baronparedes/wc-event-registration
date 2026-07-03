import { useMutation, useQueryClient } from '@tanstack/react-query';

import { writeAdminAuditLogSafely } from '@/lib/domain/admin-audit';
import { supabase } from '@/lib/infrastructure';

import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery';

/** Archives an event (soft-delete) by setting its status to 'archived'. */
export function useArchiveEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { data: event } = await supabase
        .from('events')
        .select('status')
        .eq('id', id)
        .maybeSingle();

      const { error } = await supabase.from('events').update({ status: 'archived' }).eq('id', id);

      if (error) throw error;

      await writeAdminAuditLogSafely({
        action: 'archive_event',
        resourceType: 'event',
        resourceId: id,
        metadata: {
          previous_status: event?.status ?? null,
          next_status: 'archived',
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY });
    },
  });
}
