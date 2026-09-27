import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { supabase } from '@/lib/infrastructure';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

export type AppNotificationRecipient = {
  id: string;
  notification_id: string;
  is_read: boolean;
  read_at: string | null;
  notification: AppNotification;
};

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export function useNotificationsQuery() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.user) return [];

      const { data, error } = await supabase
        .from('app_notification_recipients')
        .select(
          `
          id,
          notification_id,
          is_read,
          read_at,
          notification:app_notifications (
            id,
            title,
            message,
            created_at
          )
        `,
        )
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []) as unknown as AppNotificationRecipient[];
    },
    staleTime: QUERY_STALE_TIME_MS.detail,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: session }) => {
      if (!session?.session?.user) return;

      const channel = supabase
        .channel('app_notification_recipients_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'app_notification_recipients',
            filter: `user_id=eq.${session.session.user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });
  }, [queryClient]);

  return query;
}
