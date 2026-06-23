import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createEdgeFunctionCaller } from '@/lib/supabase'
import { ADMIN_REGISTRATIONS_QUERY_KEY } from '../queries/useAdminRegistrationsQuery'

interface ReactivateRegistrationRequest {
  registration_id: string
}

interface ReactivateRegistrationResponse {
  success: true
  registration_id: string
}

interface ReactivateRegistrationErrorResponse {
  success: false
  error: string
  error_code?: string
}

/**
 * Reactivates a registration by restoring its status from 'cancelled' to 'updated'.
 * Invalidates the registrations list query on success.
 */
export function useReactivateRegistrationMutation(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: ReactivateRegistrationRequest) => {
      const caller = createEdgeFunctionCaller<
        ReactivateRegistrationRequest,
        ReactivateRegistrationResponse | ReactivateRegistrationErrorResponse
      >('reactivate-registration')
      const response = await caller(data)
      if (!('success' in response) || !response.success) {
        const error = response as ReactivateRegistrationErrorResponse
        throw new Error(error.error ?? 'Failed to reactivate registration')
      }
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_REGISTRATIONS_QUERY_KEY(eventId) })
    },
  })
}
