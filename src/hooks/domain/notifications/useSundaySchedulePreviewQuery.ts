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
    staleTime: 15_000,
  });
}
