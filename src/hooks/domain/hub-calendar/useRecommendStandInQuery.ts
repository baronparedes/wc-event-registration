import { useQuery } from '@tanstack/react-query';

import {
  type RecommendStandInPayload,
  type RecommendStandInResponse,
  recommendStandIn,
} from '@/lib/domain/hub-calendar';

export const STAND_IN_RECOMMENDATIONS_QUERY_KEY = (
  targetDate?: string,
  timeSlot?: string,
  role?: string,
  excusedToken?: string,
  neededCount?: number,
  candidateTokensKey?: string,
) =>
  [
    'stand-in-recommendations',
    targetDate ?? '',
    timeSlot ?? '',
    role ?? '',
    excusedToken ?? 'none',
    neededCount ?? 1,
    candidateTokensKey ?? '',
  ] as const;

export interface UseRecommendStandInQueryOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export const DEFAULT_STAND_IN_CACHE_STALE_TIME = 10 * 60 * 1000; // 10 minutes
export const DEFAULT_STAND_IN_CACHE_GC_TIME = 15 * 60 * 1000; // 15 minutes

export function useRecommendStandInQuery(
  payload: RecommendStandInPayload | null,
  options?: UseRecommendStandInQueryOptions,
) {
  const candidateTokensKey =
    payload?.candidates
      .map((c) => c.token)
      .sort()
      .join(',') ?? '';

  return useQuery<RecommendStandInResponse, Error>({
    queryKey: STAND_IN_RECOMMENDATIONS_QUERY_KEY(
      payload?.targetDate,
      payload?.timeSlot,
      payload?.role,
      payload?.excusedMemberToken,
      payload?.neededCount,
      candidateTokensKey,
    ),
    queryFn: () => {
      if (!payload) {
        throw new Error('Missing recommendation payload');
      }
      return recommendStandIn(payload);
    },
    enabled: Boolean(options?.enabled && payload && payload.candidates.length > 0),
    staleTime: options?.staleTime ?? DEFAULT_STAND_IN_CACHE_STALE_TIME,
    gcTime: options?.gcTime ?? DEFAULT_STAND_IN_CACHE_GC_TIME,
  });
}
