import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { updateRecruitmentStage } from '@/lib/domain/recruitment';
import type { AdminUpdateStageInput } from '@/lib/domain/recruitment';

export function useUpdateRecruitmentStageMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AdminUpdateStageInput) => updateRecruitmentStage(input),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminRecruitmentApplications() }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.adminRecruitmentApplication(variables.application_id),
        }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myRecruitmentApplication() }),
      ]);
    },
  });
}
