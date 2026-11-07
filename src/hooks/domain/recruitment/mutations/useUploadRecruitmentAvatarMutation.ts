import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { uploadRecruitmentApplicantAvatar } from '@/lib/domain/recruitment';

export function useUploadRecruitmentAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { applicationId: string; imageBase64: string }) =>
      uploadRecruitmentApplicantAvatar(params),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminRecruitmentApplications() }),
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.adminRecruitmentApplication(variables.applicationId),
        }),
      ]);
    },
  });
}
