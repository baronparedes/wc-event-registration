import { useMutation } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export type LookupUserByRfidResult = {
  id: string;
  member_id: string;
  full_name: string;
};

export function useLookupUsersByRfidsMutation() {
  return useMutation({
    mutationFn: async (rfids: string[]): Promise<LookupUserByRfidResult[]> => {
      if (rfids.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, member_id, full_name')
        .in('member_id', rfids);

      if (error) {
        throw error;
      }

      return (data ?? []).map((u) => ({
        id: u.id,
        member_id: u.member_id,
        full_name: u.full_name,
      }));
    },
  });
}
