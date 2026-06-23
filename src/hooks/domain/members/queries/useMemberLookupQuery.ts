import { useMutation } from '@tanstack/react-query'
import { createEdgeFunctionCaller } from '../../../../lib/supabase'
import { logger } from '../../../../lib/logger'

export interface MemberLookupProfile {
  user_id: string
  full_name: string
  nickname: string | null
  first_name: string | null
  last_name: string | null
}

export interface ExistingRegistrationState {
  exists: boolean
  edit_allowed: boolean
  status: 'submitted' | 'updated' | 'cancelled'
  responses: Record<string, unknown>
}

export interface MemberLookupResult {
  profile: MemberLookupProfile | null
  existing_registration: ExistingRegistrationState | null
}

interface MemberLookupResponse {
  success: true
  profile: MemberLookupProfile | null
  existing_registration: ExistingRegistrationState | null
}

const callMemberLookup = createEdgeFunctionCaller<
  { memberId: string; eventSlug?: string },
  MemberLookupResponse
>('member-lookup')

/**
 * Hook for member ID-first lookup in public registration flow.
 * Calls member-lookup Edge Function for ID verification and profile retrieval.
 *
 * @returns React Query mutation for looking up member by ID
 */
export function useMemberLookupQuery() {
  return useMutation<MemberLookupResult, Error, { memberId: string; eventSlug?: string }>({
    mutationFn: async ({ memberId, eventSlug }) => {
      const normalized = memberId.trim()
      if (!normalized) {
        return { profile: null, existing_registration: null }
      }

      logger.debug('Looking up member:', normalized)
      const response = await callMemberLookup({ memberId: normalized, eventSlug })
      return {
        profile: response.profile,
        existing_registration: response.existing_registration,
      }
    },
    onError: (error) => {
      logger.error('Member lookup query error:', error)
    },
  })
}
