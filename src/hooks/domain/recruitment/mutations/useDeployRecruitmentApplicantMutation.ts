import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { ADMIN_MEMBERS_QUERY_KEY } from '@/hooks/domain/members';
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
        queryClient.invalidateQueries({ queryKey: ADMIN_MEMBERS_QUERY_KEY() }),
      ]);
    },
  });
}
