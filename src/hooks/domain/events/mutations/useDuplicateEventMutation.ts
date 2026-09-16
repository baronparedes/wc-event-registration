import { useMutation, useQueryClient } from '@tanstack/react-query';

import { writeAdminAuditLogSafely } from '@/lib/domain/admin-audit';
import { supabase } from '@/lib/infrastructure';

import { ADMIN_EVENTS_QUERY_KEY } from '../queries/useAdminEventsQuery';

export type DuplicateEventInput = {
  source_event_id: string;
  new_title: string;
  new_slug: string;
};

export function useDuplicateEventMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DuplicateEventInput): Promise<string> => {
      const { data, error } = await supabase.functions.invoke<{
        success: boolean;
        new_event_id?: string;
        error?: string;
      }>('duplicate-event', {
        body: input,
      });

      if (error) {
        throw error;
      }

      if (!data || !data.success || !data.new_event_id) {
        throw new Error(data?.error || 'Failed to duplicate event');
      }

      await writeAdminAuditLogSafely({
        action: 'create_event', // or you could have a specific duplicate action
        resourceType: 'event',
        resourceId: data.new_event_id,
        metadata: {
          slug: input.new_slug,
          title: input.new_title,
          status: 'draft',
          duplicated_from: input.source_event_id,
        },
      });

      return data.new_event_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY });
    },
  });
}
