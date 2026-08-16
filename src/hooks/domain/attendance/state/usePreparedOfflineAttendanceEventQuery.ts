import { useQuery } from '@tanstack/react-query';

import {
  type OfflineAttendanceOwner,
  readPreparedOfflineAttendanceEvent,
  readPreparedOfflineAttendanceEventForUser,
} from '@/lib/infrastructure';

export function usePreparedOfflineAttendanceEventQuery(
  eventId: string | undefined,
  owner: OfflineAttendanceOwner | null,
  ownerUserId?: string,
) {
  return useQuery({
    queryKey: [
      'prepared-offline-attendance-event',
      eventId,
      owner?.userId ?? ownerUserId,
      owner?.role,
    ],
    queryFn: () => {
      if (!eventId || (!owner && !ownerUserId)) {
        return null;
      }

      return owner
        ? readPreparedOfflineAttendanceEvent(eventId, owner)
        : readPreparedOfflineAttendanceEventForUser(eventId, ownerUserId!);
    },
    enabled: Boolean(eventId && (owner || ownerUserId)),
    staleTime: Infinity,
    gcTime: 0,
  });
}
