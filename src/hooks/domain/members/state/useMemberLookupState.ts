import { useState, useCallback } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { logger } from '@/lib/infrastructure'
import type { MemberLookupProfile } from '@/lib/domain/members'
import { useMemberLookupQuery } from '../queries/useMemberLookupQuery'

const memberLookupSchema = z.object({
  memberId: z.string().trim().max(64, 'Member ID is too long').optional(),
  name: z.string().trim().max(200, 'Name is too long').optional(),
})

type MemberLookupFormValues = z.infer<typeof memberLookupSchema>

type MemberLookupResult =
  | { success: true; mode: 'new_registration' | 'update_registration' }
  | {
      success: false
      error: string
      reason: 'not_found' | 'already_registered' | 'lookup_unavailable'
    }

export type MemberLookupState = {
  matchedMember: MemberLookupProfile | null
  verifiedMemberId: string | null
  memberIdHighlight: boolean
  isRegistrationBlocked: boolean
  isUpdateMode: boolean
  lockedStepMessage: string | null
  prefillResponses: Record<string, unknown> | null
}

export type MemberLookupActions = {
  reset: () => void
  clearMember: () => void
}

/**
 * Custom hook for managing member lookup state and logic.
 * Encapsulates all member verification, duplicate policy handling, and update mode logic.
 * Supports both ID-first and name-based lookup modes.
 */
export function useMemberLookupState(eventSlug: string | undefined, onMemberCleared?: () => void) {
  const [matchedMember, setMatchedMember] = useState<MemberLookupProfile | null>(null)
  const [verifiedMemberId, setVerifiedMemberId] = useState<string | null>(null)
  const [memberIdHighlight, setMemberIdHighlight] = useState(false)
  const [isRegistrationBlocked, setIsRegistrationBlocked] = useState(false)
  const [isUpdateMode, setIsUpdateMode] = useState(false)
  const [lockedStepMessage, setLockedStepMessage] = useState<string | null>(null)
  const [prefillResponses, setPrefillResponses] = useState<Record<string, unknown> | null>(null)

  const lookupForm = useForm<MemberLookupFormValues>({
    resolver: zodResolver(memberLookupSchema),
    defaultValues: {
      memberId: '',
      name: '',
    },
  })

  const lookupMutation = useMemberLookupQuery()

  const clearMember = useCallback(() => {
    setMatchedMember(null)
    setVerifiedMemberId(null)
    setMemberIdHighlight(false)
    setIsRegistrationBlocked(false)
    setIsUpdateMode(false)
    setLockedStepMessage(null)
    setPrefillResponses(null)
    onMemberCleared?.()
  }, [onMemberCleared])

  const reset = useCallback(() => {
    clearMember()
    lookupForm.reset()
  }, [clearMember, lookupForm])

  const handleLookupSubmit = useCallback(
    async (values: MemberLookupFormValues): Promise<MemberLookupResult> => {
      // Clear previous state
      clearMember()

      try {
        logger.info('Member lookup attempt:', { memberId: values.memberId, name: values.name })

        const result = await lookupMutation.mutateAsync({
          memberId: values.memberId,
          name: values.name,
          eventSlug: eventSlug || '',
        })

        if (!result.profile) {
          setMatchedMember(null)
          setVerifiedMemberId(null)
          lookupForm.reset()
          logger.warn('Member lookup returned null')
          // Return error state to caller via hook state
          return {
            success: false,
            error: `We could not verify that entry. Please contact your administrator for support.`,
            reason: 'not_found',
          }
        }

        if (result.existing_registration?.exists && !result.existing_registration.edit_allowed) {
          setMatchedMember(result.profile)
          setVerifiedMemberId(null)
          setIsRegistrationBlocked(true)
          setIsUpdateMode(false)
          setPrefillResponses(null)
          setLockedStepMessage('Already registered for this event. Verify another member.')
          setMemberIdHighlight(true)
          lookupForm.reset()
          logger.info('Duplicate registration blocked during lookup')
          return {
            success: false,
            error: 'You are already registered for this event.',
            reason: 'already_registered',
          }
        }

        // Successful lookup - member found and eligible
        setMatchedMember(result.profile)
        // Always store the member_id from the profile for submission to Edge Function
        setVerifiedMemberId(result.profile.member_id)
        setIsRegistrationBlocked(false)
        setIsUpdateMode(Boolean(result.existing_registration?.edit_allowed))
        setPrefillResponses(result.existing_registration?.responses ?? null)
        setMemberIdHighlight(Boolean(result.existing_registration?.edit_allowed))

        logger.info('Member lookup successful:', result.profile)
        return {
          success: true,
          mode: result.existing_registration?.edit_allowed
            ? 'update_registration'
            : 'new_registration',
        }
      } catch (error) {
        setMatchedMember(null)
        setVerifiedMemberId(null)
        setIsRegistrationBlocked(false)
        logger.error('Member lookup failed:', error)
        return {
          success: false,
          error: 'Lookup is unavailable right now. Please try again in a moment.',
          reason: 'lookup_unavailable',
        }
      }
    },
    [eventSlug, clearMember, lookupMutation, lookupForm],
  )

  return {
    // State
    matchedMember,
    verifiedMemberId,
    memberIdHighlight,
    isRegistrationBlocked,
    isUpdateMode,
    lockedStepMessage,
    prefillResponses,
    // Form
    lookupForm: lookupForm as UseFormReturn<MemberLookupFormValues>,
    // Mutations
    isLookupPending: lookupMutation.isPending,
    // Actions
    handleLookupSubmit,
    clearMember,
    reset,
  }
}
