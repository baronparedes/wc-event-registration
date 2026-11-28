import { useContext } from 'react';

import { QueryClient, QueryClientContext, useMutation } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import {
  type AppSettingsMap,
  type EditableSystemSettingKey,
  type UpdateAppSettingPayload,
  updateAppSetting,
} from '@/lib/domain/app-settings';

const fallbackQueryClient = new QueryClient({
  defaultOptions: { mutations: { retry: false } },
});

export function useUpdateAppSettingMutation() {
  const contextClient = useContext(QueryClientContext);
  const queryClient = contextClient ?? fallbackQueryClient;

  return useMutation<
    AppSettingsMap[EditableSystemSettingKey],
    Error,
    UpdateAppSettingPayload<EditableSystemSettingKey>
  >(
    {
      mutationFn: (payload) => updateAppSetting(payload),
      onSuccess: (updatedValue, variables) => {
        queryClient.setQueryData<AppSettingsMap>(QUERY_KEYS.appSettings(), (prev) =>
          prev ? { ...prev, [variables.key]: updatedValue } : prev,
        );
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appSettings() });
        void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.publicAppSettings() });
        if (variables.key === 'volunteer_roles' || variables.key === 'service_time_slots') {
          void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.publicRecruitmentConfig() });
        }
      },
    },
    queryClient,
  );
}
