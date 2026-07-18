import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

type DeleteSavedViewPayload = {
  id: string;
  eventId?: string; // For invalidation purposes
};

type DeleteSavedViewSuccess = {
  success: true;
};

type DeleteSavedViewError = {
  success: false;
  error: string;
  error_code?: string;
  detail?: string;
};

/**
 * Deletes a saved view by ID.
 */
export function useDeleteAttendanceSavedViewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: DeleteSavedViewPayload): Promise<void> => {
      const caller = createEdgeFunctionCaller<
        { id: string },
        DeleteSavedViewSuccess | DeleteSavedViewError
      >('delete-attendance-saved-view');

      const response = await caller({ id: payload.id });
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete view.');
      }
    },
    onSuccess: (_result, variables) => {
      if (variables.eventId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.adminAttendanceSavedViews(variables.eventId),
        });
      }
    },
  });
}
