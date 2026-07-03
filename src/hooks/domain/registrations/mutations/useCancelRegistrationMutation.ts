import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createEdgeFunctionCaller } from '@/lib/infrastructure';

import { ADMIN_REGISTRATIONS_QUERY_KEY } from '../queries/useAdminRegistrationsQuery';

interface CancelRegistrationRequest {
  registration_id: string;
  reason?: string;
}

interface CancelRegistrationResponse {
  success: true;
  registration_id: string;
}

interface CancelRegistrationErrorResponse {
  success: false;
  error: string;
  error_code?: string;
}

/**
 * Cancels a registration by marking its status as 'cancelled'.
 * Invalidates the registrations list query on success.
 */
export function useCancelRegistrationMutation(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CancelRegistrationRequest) => {
      const caller = createEdgeFunctionCaller<
        CancelRegistrationRequest,
        CancelRegistrationResponse | CancelRegistrationErrorResponse
      >('cancel-registration');
      const response = await caller(data);
      if (!('success' in response) || !response.success) {
        const error = response as CancelRegistrationErrorResponse;
        throw new Error(error.error ?? 'Failed to cancel registration');
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REGISTRATIONS_QUERY_KEY(eventId) });
    },
  });
}
