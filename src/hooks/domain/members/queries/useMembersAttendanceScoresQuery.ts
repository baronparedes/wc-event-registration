import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { env } from '@/config/env';
import { fetchMembersAttendanceScores } from '@/lib/domain/members';

export function useMembersAttendanceScoresQuery(weeks = 12) {
  return useQuery({
    queryKey: ['members-attendance-scores', weeks, env.excuseEventId] as const,
    queryFn: () => fetchMembersAttendanceScores(weeks, env.excuseEventId),
    staleTime: QUERY_STALE_TIME_MS.oneDay,
  });
}
