import { useMutation, useQueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants';
import type { AttendanceSettings, UpdateAttendanceSettingsInput } from '@/lib/domain/attendance';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

type UpdateAttendanceSettingsSuccess = {
  success: true;
  settings: AttendanceSettings;
};

type UpdateAttendanceSettingsError = {
  success: false;
  error: string;
  error_code?: string;
  detail?: string;
};

/** Updates event attendance settings and refreshes settings cache on success. */
export function useUpdateAttendanceSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAttendanceSettingsInput): Promise<AttendanceSettings> => {
      const caller = createEdgeFunctionCaller<
        UpdateAttendanceSettingsInput,
        UpdateAttendanceSettingsSuccess | UpdateAttendanceSettingsError
      >('update-attendance-settings');

      const response = await caller(payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update attendance settings.');
      }

      return response.settings;
    },
    onSuccess: (_settings, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.adminAttendanceSettings(variables.event_id),
      });
    },
  });
}
