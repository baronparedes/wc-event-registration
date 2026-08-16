import { useQuery } from '@tanstack/react-query';

import type { OfflineAttendanceOwner, QueuedOfflineCheckIn } from '@/lib/infrastructure';
import { listOfflineCheckIns } from '@/lib/infrastructure';

export function useOfflineCheckInOutboxState(
  eventId: string | undefined,
  owner: OfflineAttendanceOwner | null,
) {
  const query = useQuery<QueuedOfflineCheckIn[]>({
    queryKey: ['offline-check-in-outbox', eventId, owner?.userId],
    queryFn: () => {
      if (!eventId || !owner) {
        return [];
      }

      return listOfflineCheckIns(eventId, owner.userId);
    },
    enabled: Boolean(eventId && owner),
    staleTime: Infinity,
    gcTime: 0,
  });
  const queue = query.data ?? [];

  return {
    queue,
    isLoading: query.isLoading,
    refresh: query.refetch,
    pendingCount: queue.filter((item) => item.status === 'pending' || item.status === 'sending')
      .length,
    lastError: [...queue].reverse().find((item) => item.lastError)?.lastError ?? null,
  };
}
