import { useMutation, useQueryClient } from '@tanstack/react-query';

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

      return data.new_event_id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_EVENTS_QUERY_KEY });
    },
  });
}
