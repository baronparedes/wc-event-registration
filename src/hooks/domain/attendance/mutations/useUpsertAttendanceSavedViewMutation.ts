import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { AttendanceSavedView } from '@/lib/domain/attendance-views';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

type UpsertSavedViewPayload = {
  id?: string;
  event_id: string;
  name?: string;
  view_config: Record<string, unknown>;
};

type UpsertSavedViewSuccess = {
  success: true;
} & AttendanceSavedView;

type UpsertSavedViewError = {
  success: false;
  error: string;
  error_code?: string;
  detail?: string;
};

/**
 * Upserts a saved view (creates new with auto-generated name or updates existing).
 */
export function useUpsertAttendanceSavedViewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertSavedViewPayload): Promise<AttendanceSavedView> => {
      const caller = createEdgeFunctionCaller<
        UpsertSavedViewPayload,
        UpsertSavedViewSuccess | UpsertSavedViewError
      >('upsert-attendance-saved-view');

      const response = await caller(payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to save view.');
      }

      return response;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceSavedViews(variables.event_id),
      });
    },
  });
}
