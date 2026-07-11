import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { CheckInAttendeeInput, CheckInResult } from '@/lib/domain/attendance';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

type CheckInAttendeeSuccess = {
  success: true;
  result: CheckInResult;
};

type CheckInAttendeeError = {
  success: false;
  error: string;
  error_code?: string;
  detail?: string;
};

/** Checks in a registered attendee while preserving first-check-in timestamp invariance. */
export function useCheckInAttendeeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CheckInAttendeeInput): Promise<CheckInResult> => {
      const caller = createEdgeFunctionCaller<
        CheckInAttendeeInput,
        CheckInAttendeeSuccess | CheckInAttendeeError
      >('check-in-attendee');

      const response = await caller(payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to check in attendee.');
      }

      return response.result;
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['admin-attendance-search', variables.event_id],
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceAnswers(variables.event_id),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceSlotSummaries(variables.event_id),
      });
    },
  });
}
