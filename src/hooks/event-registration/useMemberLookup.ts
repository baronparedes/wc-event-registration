import { useState, useCallback } from 'react'
import { useForm, type UseFormReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { logger } from '../../lib/logger'
import { useMemberLookupMutation } from './useMemberLookupMutation'
import type { MemberLookupProfile } from '../../lib/event-registration'

const memberLookupSchema = z.object({
  memberId: z.string().trim().min(1, 'Member ID is required').max(64, 'Member ID is too long'),
})

type MemberLookupFormValues = z.infer<typeof memberLookupSchema>

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
 */
export function useMemberLookup(eventSlug: string | undefined, onMemberCleared?: () => void) {
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
    },
  })

  const lookupMutation = useMemberLookupMutation()

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
    async (values: MemberLookupFormValues) => {
      // Clear previous state
      clearMember()

      try {
        logger.info('Member lookup attempt:', values.memberId)
        const result = await lookupMutation.mutateAsync({
          memberId: values.memberId,
          eventSlug: eventSlug || '',
        })

        if (!result.profile) {
          setMatchedMember(null)
          setVerifiedMemberId(null)
          lookupForm.reset()
          logger.warn('Member lookup returned null for ID:', values.memberId)
          // Return error state to caller via hook state
          return { success: false, error: 'We could not verify that ID. Check it and try again.' }
        }

        if (result.existing_registration?.exists && !result.existing_registration.edit_allowed) {
          setMatchedMember(result.profile)
          setVerifiedMemberId(null)
          setIsRegistrationBlocked(true)
          setIsUpdateMode(false)
          setPrefillResponses(null)
          setLockedStepMessage('Already registered for this event. Verify another member ID.')
          setMemberIdHighlight(true)
          lookupForm.reset()
          logger.info('Duplicate registration blocked during lookup:', values.memberId)
          return { success: false, error: 'You are already registered for this event.' }
        }

        // Successful lookup - member found and eligible
        setMatchedMember(result.profile)
        setVerifiedMemberId(values.memberId)
        setIsRegistrationBlocked(false)
        setIsUpdateMode(Boolean(result.existing_registration?.edit_allowed))
        setPrefillResponses(result.existing_registration?.responses ?? null)
        setMemberIdHighlight(Boolean(result.existing_registration?.edit_allowed))

        logger.info('Member lookup successful:', result.profile)
        return { success: true }
      } catch (error) {
        setMatchedMember(null)
        setVerifiedMemberId(null)
        setIsRegistrationBlocked(false)
        logger.error('Member lookup failed:', error)
        return {
          success: false,
          error: 'Lookup is unavailable right now. Please try again in a moment.',
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
