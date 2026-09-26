import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type CreateServiceAttendanceInput,
  type ServiceAttendance,
  recordServiceAttendance,
} from '@/lib/domain/services';

export function useRecordServiceAttendanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateServiceAttendanceInput): Promise<ServiceAttendance> => {
      return recordServiceAttendance(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance'] });
    },
  });
}
