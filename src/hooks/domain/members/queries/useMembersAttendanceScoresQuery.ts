import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import {
  type FetchMembersAttendanceScoresOptions,
  fetchMembersAttendanceScores,
} from '@/lib/domain/members';

export function useMembersAttendanceScoresQuery(
  weeksOrOptions: number | FetchMembersAttendanceScoresOptions = 12,
) {
  const options: FetchMembersAttendanceScoresOptions =
    typeof weeksOrOptions === 'number' ? { weeks: weeksOrOptions } : weeksOrOptions;
  const weeks = options.weeks ?? 12;
  const dateRange = options.dateRange;

  return useQuery({
    queryKey: [
      'members-attendance-scores',
      weeks,
      dateRange?.startDate ?? null,
      dateRange?.endDate ?? null,
    ] as const,
    queryFn: () =>
      dateRange
        ? fetchMembersAttendanceScores({
            weeks,
            dateRange,
          })
        : fetchMembersAttendanceScores(weeks),
    staleTime: QUERY_STALE_TIME_MS.oneDay,
  });
}
