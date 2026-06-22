import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { createEdgeFunctionCaller } from '../../lib/supabase'
import { logger } from '../../lib/logger'
import type { DynamicFieldResponseValues } from '../../lib/event-registration'

export interface SubmitRegistrationRequest {
  event_slug: string
  member_id: string
  responses: DynamicFieldResponseValues
  idempotency_key: string
}

export interface SubmitRegistrationSuccess {
  success: true
  registration_id: string
  status: 'submitted' | 'updated'
  is_new: boolean
  message: string
}

export interface SubmitRegistrationError {
  success: false
  error: string
  error_code?: string
  error_detail?: string
}

export type SubmitRegistrationResult = SubmitRegistrationSuccess | SubmitRegistrationError

const callSubmitRegistration = createEdgeFunctionCaller<
  SubmitRegistrationRequest,
  SubmitRegistrationResult
>('submit-registration')

/**
 * Hook for submitting registration through submit-registration Edge Function.
 * Handles duplicate policy enforcement, idempotency, and persistence.
 *
 * @returns React Query mutation for submitting registration
 */
export function useSubmitRegistrationMutation() {
  const queryClient = useQueryClient()

  return useMutation<SubmitRegistrationResult, Error, SubmitRegistrationRequest>({
    mutationFn: async (data) => {
      logger.debug('Submitting registration via Edge Function:', data)
      return callSubmitRegistration(data)
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['public-event-by-slug', variables.event_slug],
      })
    },
    onError: (error) => {
      logger.error('Registration mutation error:', error)
      toast.error('Failed to submit registration. Please try again.')
    },
  })
}
