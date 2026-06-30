import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEdgeFunctionCaller } from '@/lib/infrastructure'

interface CancelPublicRegistrationRequest {
  registration_id: string
  reason?: string
}

interface CancelPublicRegistrationResponse {
  success: true
  registration_id: string
}

interface CancelPublicRegistrationErrorResponse {
  success: false
  error: string
  error_code?: string
}

/**
 * Mutation for admins to cancel a public registration by marking its status as 'cancelled'.
 * Invalidates admin public registrations queries on success.
 */
export function useCancelPublicRegistrationMutation(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CancelPublicRegistrationRequest) => {
      const caller = createEdgeFunctionCaller<
        CancelPublicRegistrationRequest,
        CancelPublicRegistrationResponse | CancelPublicRegistrationErrorResponse
      >('cancel-public-registration')
      const response = await caller(data)
      if (!('success' in response) || !response.success) {
        const error = response as CancelPublicRegistrationErrorResponse
        throw new Error(error.error ?? 'Failed to cancel public registration')
      }
      return response
    },
    onSuccess: () => {
      // Invalidate both event and admin queries for public registrations
      queryClient.invalidateQueries({
        queryKey: ['admin-public-registrations', eventId],
      })
      queryClient.invalidateQueries({
        queryKey: ['publicRegistrationCount', eventId],
      })
    },
  })
}
