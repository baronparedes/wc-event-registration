import { useQuery } from '@tanstack/react-query';

import { createEdgeFunctionCaller } from '@/lib/infrastructure';

export type ExcusedMemberRecord = {
  memberId: string;
  requestDate: string;
  services: string;
};

type GetExcusedMembersRequest = {
  year: number;
  monthIndex: number;
};

type GetExcusedMembersResponse = {
  success: boolean;
  records: ExcusedMemberRecord[];
  error?: string;
};

const getExcusedMembers = createEdgeFunctionCaller<
  GetExcusedMembersRequest,
  GetExcusedMembersResponse
>('get-excused-members');

export function useAdminHubCalendarExcusedMembers(year: number, monthIndex: number) {
  return useQuery({
    queryKey: ['admin-hub-calendar-excused', year, monthIndex],
    queryFn: async () => {
      const result = await getExcusedMembers({ year, monthIndex });
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch excused members');
      }
      return result.records;
    },
    staleTime: 5 * 60 * 1000,
  });
}
