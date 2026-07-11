import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { BulkUpsertAttendanceAnswersInput } from '@/lib/domain/attendance';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

type BulkUpsertAttendanceAnswersResponse = {
  success: boolean;
  imported_count: number;
  error?: string;
};

/** Bulk-upserts attendance answers for multiple attendees using server-side validation. */
export function useBulkUpsertAttendanceAnswersMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: BulkUpsertAttendanceAnswersInput,
    ): Promise<BulkUpsertAttendanceAnswersResponse> => {
      const caller = createEdgeFunctionCaller<
        BulkUpsertAttendanceAnswersInput,
        BulkUpsertAttendanceAnswersResponse
      >('bulk-upsert-attendance-answers');

      return caller(input);
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceAnswers(variables.event_id),
      });
    },
  });
}
