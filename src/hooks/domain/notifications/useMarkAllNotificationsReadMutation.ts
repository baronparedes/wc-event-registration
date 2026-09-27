import { useMutation, useQueryClient } from '@tanstack/react-query';

import { markAllNotificationsAsRead } from '@/lib/domain/notifications';

import { NOTIFICATIONS_QUERY_KEY } from './useNotificationsQuery';

export function useMarkAllNotificationsReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
