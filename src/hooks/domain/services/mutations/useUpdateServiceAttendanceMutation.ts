import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type ServiceAttendance,
  type UpdateServiceAttendanceInput,
  updateServiceAttendance,
} from '@/lib/domain/services';

export function useUpdateServiceAttendanceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateServiceAttendanceInput;
    }): Promise<ServiceAttendance> => {
      return updateServiceAttendance(id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-attendance'] });
    },
  });
}
