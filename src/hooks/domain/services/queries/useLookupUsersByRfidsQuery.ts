import { useQuery } from '@tanstack/react-query';

import { fetchServiceUsersByRfids } from '@/lib/domain/services';

export type LookupUserByRfidResult = {
  id: string;
  member_id: string;
  full_name: string;
};

export const lookupUsersByRfidsQueryKey = (rfids: string[]) =>
  ['lookup-users-by-rfids', [...new Set(rfids.filter(Boolean))].sort()] as const;

export function useLookupUsersByRfidsQuery(rfids: string[]) {
  const normalizedRfids = Array.from(new Set(rfids.filter(Boolean))).sort();

  return useQuery({
    queryKey: lookupUsersByRfidsQueryKey(normalizedRfids),
    queryFn: async (): Promise<LookupUserByRfidResult[]> => {
      if (normalizedRfids.length === 0) {
        return [];
      }

      const data = await fetchServiceUsersByRfids(normalizedRfids);

      return data.map((u) => ({
        id: u.id,
        member_id: u.member_id,
        full_name: u.full_name,
      }));
    },
    enabled: normalizedRfids.length > 0,
  });
}
