import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type TriggerWeeklyDebriefParams,
  type TriggerWeeklyDebriefResponse,
  triggerWeeklySundayDebrief,
} from '@/lib/domain/services';

import { SERVICE_WEEKLY_BRIEFS_QUERY_KEY } from '../queries/useServiceWeeklyBriefQuery';

export function useTriggerWeeklyDebriefMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: TriggerWeeklyDebriefParams = {},
    ): Promise<TriggerWeeklyDebriefResponse> => {
      return triggerWeeklySundayDebrief(params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SERVICE_WEEKLY_BRIEFS_QUERY_KEY });
      if (data?.brief?.sunday_date) {
        queryClient.setQueryData(
          [...SERVICE_WEEKLY_BRIEFS_QUERY_KEY, 'by-date', data.brief.sunday_date],
          data.brief,
        );
      }
    },
  });
}
