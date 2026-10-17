import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  type ServiceExcuseRequest,
  type SubmitServiceExcuseInput,
  submitServiceExcuse,
} from '@/lib/domain/services';

export function useSubmitExcuseMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SubmitServiceExcuseInput): Promise<ServiceExcuseRequest> => {
      return submitServiceExcuse(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-excused-schedule'] });
      queryClient.invalidateQueries({ queryKey: ['service-excuse-requests'] });
      queryClient.invalidateQueries({ queryKey: ['commitment-dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['missed-service-commitments'] });
      queryClient.invalidateQueries({ queryKey: ['volunteer-attendance-log'] });
    },
  });
}
