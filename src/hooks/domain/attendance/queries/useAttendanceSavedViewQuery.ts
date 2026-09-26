import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { QUERY_KEYS } from '@/config/constants/queryKeys';
import { fetchAttendanceSavedView } from '@/lib/domain/attendance';
import type { AttendanceSavedView } from '@/lib/domain/attendance-views';

/**
 * Fetches a single saved view by ID.
 */
export function useAttendanceSavedViewQuery(viewId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceSavedView(viewId),
    queryFn: async (): Promise<AttendanceSavedView> => {
      if (!viewId) throw new Error('View ID is required');

      return fetchAttendanceSavedView(viewId);
    },
    enabled: !!viewId,
    staleTime: QUERY_STALE_TIME_MS.short,
  });
}
