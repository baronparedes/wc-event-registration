import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { QUERY_KEYS } from '@/config/constants/queryKeys';
import { fetchAttendanceSavedViews } from '@/lib/domain/attendance';
import type { AttendanceSavedView } from '@/lib/domain/attendance-views';

/**
 * Fetches all saved views for a specific event.
 */
export function useAttendanceSavedViewsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceSavedViews(eventId),
    queryFn: async (): Promise<AttendanceSavedView[]> => {
      if (!eventId) throw new Error('Event ID is required');

      return fetchAttendanceSavedViews(eventId);
    },
    enabled: !!eventId,
    staleTime: QUERY_STALE_TIME_MS.short,
  });
}
