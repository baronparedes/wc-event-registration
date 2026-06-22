import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  submitRegistrationResponse,
  type SubmitRegistrationRequest,
  type SubmitRegistrationResult,
} from '../../lib/event-registration/commands'
import { logger } from '../../lib/logger'

/**
 * Hook for submitting registration response through secure backend RPC.
 * Handles duplicate policy enforcement, idempotency, and persistence.
 *
 * @returns React Query mutation for submitting registration
 */
export function useSubmitRegistrationMutation() {
  return useMutation<SubmitRegistrationResult, Error, SubmitRegistrationRequest>({
    mutationFn: (data) => {
      logger.debug('Submitting registration via RPC:', data)
      return submitRegistrationResponse(data)
    },
    onError: (error) => {
      logger.error('Registration mutation error:', error)
      toast.error('Failed to submit registration. Please try again.')
    },
  })
}
