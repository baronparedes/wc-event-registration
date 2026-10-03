import { useQuery } from '@tanstack/react-query';

import { type SundaySchedulePreview, getSundaySchedulePreview } from '@/lib/domain/notifications';

export const SUNDAY_SCHEDULE_PREVIEW_QUERY_KEY = ['sunday-schedule-preview'] as const;

export interface UseSundaySchedulePreviewOptions {
  targetSundayDate?: string;
  enabled?: boolean;
}

export function useSundaySchedulePreviewQuery({
  targetSundayDate,
  enabled = true,
}: UseSundaySchedulePreviewOptions = {}) {
  return useQuery<SundaySchedulePreview>({
    queryKey: [...SUNDAY_SCHEDULE_PREVIEW_QUERY_KEY, targetSundayDate ?? 'nearest'],
    queryFn: () => getSundaySchedulePreview(targetSundayDate),
    enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (
        data &&
        (data.push_delivery?.status === 'queued' || data.email_delivery?.status === 'queued')
      ) {
        return 2500;
      }
      return false;
    },
    staleTime: 5_000,
  });
}
