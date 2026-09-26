import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { type AttendanceField, fetchAttendanceFields } from '@/lib/domain/attendance-fields';

type UseAttendanceFieldsQueryOptions = {
  activeOnly?: boolean;
};

/**
 * Fetches all attendance fields for the given event, ordered by display_order.
 * Used in the admin attendance field builder.
 */
export function useAttendanceFieldsQuery(
  eventId: string | undefined,
  options: UseAttendanceFieldsQueryOptions = {},
) {
  const activeOnly = options.activeOnly ?? false;

  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceFieldsByActivity(eventId, activeOnly),
    queryFn: async (): Promise<AttendanceField[]> => {
      if (!eventId) return [];
      return fetchAttendanceFields(eventId, activeOnly);
    },
    enabled: Boolean(eventId),
  });
}
