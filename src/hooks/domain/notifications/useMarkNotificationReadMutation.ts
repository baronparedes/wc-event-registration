import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

import { NOTIFICATIONS_QUERY_KEY } from './useNotificationsQuery';

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recipientId: string) => {
      const { data, error } = await supabase
        .from('app_notification_recipients')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', recipientId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
