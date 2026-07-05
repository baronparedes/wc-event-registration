import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { QUERY_KEYS } from '@/config/constants';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';
import { createEdgeFunctionCaller } from '@/lib/infrastructure';
import { logger } from '@/lib/infrastructure';

export interface SubmitRegistrationRequest {
  event_slug: string;
  member_id: string;
  responses: DynamicFieldResponseValues;
  idempotency_key: string;
}

export interface SubmitRegistrationSuccess {
  success: true;
  registration_id: string;
  status: 'submitted' | 'updated';
  is_new: boolean;
  message: string;
}

export interface SubmitRegistrationError {
  success: false;
  error: string;
  error_code?: string;
  error_detail?: string;
  errors?: Array<{
    fieldKey: string;
    message: string;
  }>;
}

export type SubmitRegistrationResult = SubmitRegistrationSuccess | SubmitRegistrationError;

const callSubmitRegistration = createEdgeFunctionCaller<
  SubmitRegistrationRequest,
  SubmitRegistrationResult
>('submit-registration');

/**
 * Hook for submitting registration through submit-registration Edge Function.
 * Handles duplicate policy enforcement, idempotency, and persistence.
 *
 * @returns React Query mutation for submitting registration
 */
export function useSubmitRegistrationMutation(eventId?: string) {
  const queryClient = useQueryClient();

  return useMutation<SubmitRegistrationResult, Error, SubmitRegistrationRequest>({
    mutationFn: async (data) => {
      logger.debug('Submitting registration via Edge Function:', data);
      return callSubmitRegistration(data);
    },
    onSuccess: (result, variables) => {
      if (!result.success) {
        return;
      }

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.publicEventBySlug(variables.event_slug),
      });

      if (eventId) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.eventSlotAvailability(eventId),
        });
      }
    },
    onError: (error) => {
      logger.error('Registration mutation error:', error);
      toast.error('Failed to submit registration. Please try again.');
    },
  });
}
