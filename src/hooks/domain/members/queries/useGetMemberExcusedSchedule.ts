import { useQuery } from '@tanstack/react-query';

import { createEdgeFunctionCaller } from '@/lib/infrastructure';

export type ExcusedMemberRecord = {
  userId?: string;
  memberId: string;
  requestDate: string;
  services: string;
  reason?: string;
};

type GetMemberExcusedScheduleRequest = {
  year: number;
  monthIndex: number;
};

type GetMemberExcusedScheduleResponse = {
  success: boolean;
  records: ExcusedMemberRecord[];
  error?: string;
};

const getMemberExcusedSchedule = createEdgeFunctionCaller<
  GetMemberExcusedScheduleRequest,
  GetMemberExcusedScheduleResponse
>('get-member-excused-schedule');

export function useGetMemberExcusedSchedule(year: number, monthIndex: number) {
  return useQuery({
    queryKey: ['member-excused-schedule', year, monthIndex],
    queryFn: async () => {
      const result = await getMemberExcusedSchedule({ year, monthIndex });
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch excused schedule');
      }
      return result.records;
    },
    staleTime: 5 * 60 * 1000,
  });
}
