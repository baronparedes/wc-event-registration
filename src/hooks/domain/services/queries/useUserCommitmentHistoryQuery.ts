import { useQuery } from '@tanstack/react-query';

import { type UserCommitmentSnapshot, fetchUserCommitmentHistory } from '@/lib/domain/services';

export const USER_COMMITMENT_HISTORY_QUERY_KEY = (userId: string) => [
  'user_commitment_history',
  userId,
];

export function useUserCommitmentHistoryQuery(userId: string) {
  return useQuery({
    queryKey: USER_COMMITMENT_HISTORY_QUERY_KEY(userId),
    queryFn: async (): Promise<UserCommitmentSnapshot[]> => {
      return fetchUserCommitmentHistory(userId);
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}
