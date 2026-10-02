import { useQuery } from '@tanstack/react-query';

import { type BroadcastAudienceStats, getBroadcastAudienceStats } from '@/lib/domain/notifications';

export const BROADCAST_AUDIENCE_STATS_QUERY_KEY = ['broadcast-audience-stats'] as const;

export interface UseBroadcastAudienceStatsOptions {
  targetType: 'all' | 'role' | 'user' | 'event';
  targetRoles?: string[] | null;
  targetUserId?: string | null;
  targetEventId?: string | null;
  enabled?: boolean;
}

export function useBroadcastAudienceStatsQuery({
  targetType,
  targetRoles,
  targetUserId,
  targetEventId,
  enabled = true,
}: UseBroadcastAudienceStatsOptions) {
  const isEnabled =
    enabled &&
    (targetType === 'all' ||
      (targetType === 'role' && !!targetRoles && targetRoles.length > 0) ||
      (targetType === 'user' && !!targetUserId) ||
      (targetType === 'event' && !!targetEventId));

  return useQuery<BroadcastAudienceStats>({
    queryKey: [
      ...BROADCAST_AUDIENCE_STATS_QUERY_KEY,
      targetType,
      targetRoles,
      targetUserId,
      targetEventId,
    ],
    queryFn: () =>
      getBroadcastAudienceStats({
        targetType,
        targetRoles,
        targetUserId,
        targetEventId,
      }),
    enabled: isEnabled,
    staleTime: 10_000,
  });
}
