import { useMutation, useQueryClient } from '@tanstack/react-query';

import { markNotificationAsRead } from '@/lib/domain/notifications';

import { NOTIFICATIONS_QUERY_KEY } from './useNotificationsQuery';

export function useMarkNotificationReadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recipientId: string) => markNotificationAsRead(recipientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });
}
