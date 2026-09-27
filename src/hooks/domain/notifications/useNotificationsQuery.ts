import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { type AppNotificationRecipient, fetchUserNotifications } from '@/lib/domain/notifications';
import { supabase } from '@/lib/infrastructure';

export type { AppNotification, AppNotificationRecipient } from '@/lib/domain/notifications';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];

export function useNotificationsQuery() {
  const queryClient = useQueryClient();

  const query = useQuery<AppNotificationRecipient[]>({
    queryKey: NOTIFICATIONS_QUERY_KEY,
    queryFn: fetchUserNotifications,
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
