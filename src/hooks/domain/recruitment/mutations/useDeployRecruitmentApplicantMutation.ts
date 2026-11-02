import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { deployRecruitmentApplicant } from '@/lib/domain/recruitment';

export function useDeployRecruitmentApplicantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (applicationId: string) => deployRecruitmentApplicant(applicationId),
    onSuccess: async (_result, applicationId) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminRecruitmentApplications() }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.adminRecruitmentApplication(applicationId),
        }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myRecruitmentApplication() }),
      ]);
    },
  });
}
