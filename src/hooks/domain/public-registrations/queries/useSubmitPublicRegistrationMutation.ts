import { useMutation, useQueryClient } from '@tanstack/react-query';

import type {
  SubmitPublicRegistrationRequest,
  SubmitPublicRegistrationResult,
} from '@/lib/domain/public-registrations';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';

/**
 * Submit a public registration with attendee info and field responses.
 * Handles both new registrations and updates based on duplicate policy.
 */
export function useSubmitPublicRegistrationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: SubmitPublicRegistrationRequest) => {
      const caller = createEdgeFunctionCaller<
        SubmitPublicRegistrationRequest,
        SubmitPublicRegistrationResult
      >('submit-public-registration');

      const response = await caller(data);

      if (!response.success) {
        const error = response as Extract<SubmitPublicRegistrationResult, { success: false }>;
        throw new Error(error.message ?? 'Failed to submit registration');
      }

      return response;
    },
    onSuccess: (_data, variables) => {
      // Invalidate check query for this email/event to reflect new registration
      queryClient.invalidateQueries({
        queryKey: ['publicAttendeeCheck', variables.attendee.email, variables.event_slug],
      });

      // Invalidate count queries
      queryClient.invalidateQueries({
        queryKey: ['publicRegistrationCount'],
      });
    },
  });
}
