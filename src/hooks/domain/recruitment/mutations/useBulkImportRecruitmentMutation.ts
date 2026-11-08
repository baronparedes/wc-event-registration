import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import {
  type BulkImportRecruitmentResponse,
  type RecruitmentImportApplicationPayload,
  bulkImportRecruitmentApplications,
} from '@/lib/domain/recruitment';

export function useBulkImportRecruitmentMutation() {
  const queryClient = useQueryClient();

  return useMutation<BulkImportRecruitmentResponse, Error, RecruitmentImportApplicationPayload[]>({
    mutationFn: (rows) => bulkImportRecruitmentApplications(rows),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminRecruitmentApplications() }),
        queryClient.invalidateQueries({ queryKey: ['approvals'] }),
      ]);
    },
  });
}
