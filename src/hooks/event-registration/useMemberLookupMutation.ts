import { useMutation } from '@tanstack/react-query'
import { lookupMemberForRegistration } from '../../lib/event-registration/queries'
import type { MemberLookupProfile } from '../../lib/event-registration/types'
import { logger } from '../../lib/logger'

/**
 * Hook for member ID-first lookup in public registration flow.
 * Required gate for accessing dynamic fields and submit.
 *
 * @returns React Query mutation for looking up member by ID
 */
export function useMemberLookupMutation() {
  return useMutation<MemberLookupProfile | null, Error, string>({
    mutationFn: (memberId: string) => {
      logger.debug('Looking up member:', memberId)
      return lookupMemberForRegistration(memberId)
    },
    onError: (error) => {
      logger.error('Member lookup mutation error:', error)
    },
  })
}
