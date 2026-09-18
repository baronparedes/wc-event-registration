import { useQuery } from '@tanstack/react-query';

import type { UserCommitmentSnapshot } from '@/lib/domain/services';
import { supabase } from '@/lib/infrastructure';

export const USER_COMMITMENT_HISTORY_QUERY_KEY = (userId: string) => [
  'user_commitment_history',
  userId,
];

export function useUserCommitmentHistoryQuery(userId: string) {
  return useQuery({
    queryKey: USER_COMMITMENT_HISTORY_QUERY_KEY(userId),
    queryFn: async (): Promise<UserCommitmentSnapshot[]> => {
      const { data, error } = await supabase
        .from('user_commitment_history')
        .select('*')
        .eq('user_id', userId)
        .order('effective_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data as unknown as UserCommitmentSnapshot[]) || [];
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}
