import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { submitRecruitmentApplication } from '@/lib/domain/recruitment';
import type { RecruitmentStep1Input } from '@/lib/domain/recruitment';

export function useSubmitRecruitmentApplicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecruitmentStep1Input) => submitRecruitmentApplication(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminRecruitmentApplications() }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myRecruitmentApplication() }),
      ]);
    },
  });
}
