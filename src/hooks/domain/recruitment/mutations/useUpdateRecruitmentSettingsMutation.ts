import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import { updateRecruitmentSettings } from '@/lib/domain/recruitment';
import type { RecruitmentSettingsInput } from '@/lib/domain/recruitment';

export function useUpdateRecruitmentSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecruitmentSettingsInput) => updateRecruitmentSettings(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recruitmentSettings() }),
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.publicRecruitmentConfig() }),
      ]);
    },
  });
}
