import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type DispatchSundayRemindersPayload,
  type DispatchSundayRemindersResponse,
  dispatchSundayReminders,
} from '@/lib/domain/notifications';

import { SUNDAY_SCHEDULE_PREVIEW_QUERY_KEY } from './useSundaySchedulePreviewQuery';

export function useDispatchSundayRemindersMutation() {
  const queryClient = useQueryClient();

  return useMutation<DispatchSundayRemindersResponse, Error, DispatchSundayRemindersPayload>({
    mutationFn: (payload: DispatchSundayRemindersPayload) => dispatchSundayReminders(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SUNDAY_SCHEDULE_PREVIEW_QUERY_KEY });
    },
  });
}
