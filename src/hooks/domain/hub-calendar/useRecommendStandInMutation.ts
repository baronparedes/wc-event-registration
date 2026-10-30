import { type UseMutationOptions, useMutation } from '@tanstack/react-query';

import {
  type RecommendStandInPayload,
  type RecommendStandInResponse,
  recommendStandIn,
} from '@/lib/domain/hub-calendar';

export type UseRecommendStandInOptions = Omit<
  UseMutationOptions<RecommendStandInResponse, Error, RecommendStandInPayload>,
  'mutationFn'
>;

export function useRecommendStandInMutation(options?: UseRecommendStandInOptions) {
  return useMutation<RecommendStandInResponse, Error, RecommendStandInPayload>({
    mutationFn: (payload) => recommendStandIn(payload),
    ...options,
  });
}
