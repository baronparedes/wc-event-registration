import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEdgeFunctionCaller } from '@/lib/infrastructure'

interface ReactivatePublicRegistrationRequest {
  registration_id: string
}

interface ReactivatePublicRegistrationResponse {
  success: true
  registration_id: string
}

interface ReactivatePublicRegistrationErrorResponse {
  success: false
  error: string
  error_code?: string
}

/**
 * Mutation to reactivate a cancelled public registration by marking its status as 'submitted'.
 * Invalidates admin public registrations queries on success.
 */
export function useReactivatePublicRegistrationMutation(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ReactivatePublicRegistrationRequest) => {
      const caller = createEdgeFunctionCaller<
        ReactivatePublicRegistrationRequest,
        ReactivatePublicRegistrationResponse | ReactivatePublicRegistrationErrorResponse
      >('reactivate-public-registration')
      const response = await caller(data)
      if (!('success' in response) || !response.success) {
        const error = response as ReactivatePublicRegistrationErrorResponse
        throw new Error(error.error ?? 'Failed to reactivate public registration')
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
