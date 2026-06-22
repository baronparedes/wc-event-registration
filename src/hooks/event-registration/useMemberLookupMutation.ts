import { useMutation } from '@tanstack/react-query'
import { createEdgeFunctionCaller } from '../../lib/supabase'
import { logger } from '../../lib/logger'

export interface MemberLookupProfile {
  user_id: string
  full_name: string
  nickname: string | null
  first_name: string | null
  last_name: string | null
}

interface MemberLookupResponse {
  success: true
  profile: MemberLookupProfile | null
}

const callMemberLookup = createEdgeFunctionCaller<{ memberId: string }, MemberLookupResponse>(
  'member-lookup',
)

/**
 * Hook for member ID-first lookup in public registration flow.
 * Calls member-lookup Edge Function for ID verification and profile retrieval.
 *
 * @returns React Query mutation for looking up member by ID
 */
export function useMemberLookupMutation() {
  return useMutation<MemberLookupProfile | null, Error, string>({
    mutationFn: async (memberId: string) => {
      const normalized = memberId.trim()
      if (!normalized) {
        return null
      }

      logger.debug('Looking up member:', normalized)
      const response = await callMemberLookup({ memberId: normalized })
      return response.profile
    },
    onError: (error) => {
      logger.error('Member lookup mutation error:', error)
    },
  })
}
