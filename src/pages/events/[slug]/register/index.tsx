import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  buildDynamicFieldResponseSchema,
  createDynamicFieldDefaultValues,
  type DynamicFieldResponseValues,
} from '@/lib/domain/event-fields'
import { logger } from '@/lib/infrastructure'
import { usePublicEventQuery } from '@/hooks/domain/events'
import { usePublicEventFieldsQuery } from '@/hooks/domain/event-fields'
import { useSubmitRegistrationMutation } from '@/hooks/domain/registrations'
import { useMemberLookupState } from '@/hooks/domain/members'
import {
  useRfidAutoFocus,
  useErrorWithFadeout,
  useScanBuffer,
  useKioskInactivityReset,
} from '@/hooks/utils'
import {
  DynamicFieldsStepCard,
  EventHeaderCard,
  LockedGateCard,
  MemberLookupStepCard,
  ProfileStepCard,
} from './components'

function formatUtcDateTime(value: string | null): string {
  if (!value) {
    return 'Not set'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Not set'
  }

  return parsed.toLocaleString()
}

export function EventRegistrationPage() {
  const { slug } = useParams<{ slug: string }>()
  const memberIdInputRef = useRef<HTMLInputElement | null>(null)
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null)
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null)

  // Core domain hooks
  const submitMutation = useSubmitRegistrationMutation()
  const eventQuery = usePublicEventQuery(slug)
  const memberLookup = useMemberLookupState(slug)
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: {},
  })

  // Member lookup state helpers
  const { clearMember, lookupForm, handleLookupSubmit: runMemberLookupSubmit } = memberLookup

  // Derived event/member gate state
  const availability = eventQuery.data
  const isGateReady = availability?.status === 'available'
  const isDynamicFieldGateReady =
    isGateReady && Boolean(memberLookup.matchedMember) && !memberLookup.isRegistrationBlocked

  const eventWindowText = useMemo(() => {
    if (!availability || availability.status !== 'available') {
      return null
    }

    return {
      opens: formatUtcDateTime(availability.event.registration_opens_at),
      closes: formatUtcDateTime(availability.event.registration_closes_at),
    }
  }, [availability])

  // Input-focus ergonomics for RFID kiosks
  const isRfidCaptureActive =
    isGateReady && memberLookup.matchedMember === null && !memberLookup.isLookupPending
  const focusMemberIdInput = useRfidAutoFocus(memberIdInputRef, isRfidCaptureActive)

  // Lookup error state with fadeout behavior
  const {
    error: lookupErrorMessage,
    isFadingOut: lookupErrorFadeOut,
    showError: showLookupError,
    clearError: clearLookupError,
  } = useErrorWithFadeout({
    fadeOutDelay: 4500,
    clearDelay: 5000,
    onClear: () => {
      clearMember()
      focusMemberIdInput()
    },
  })

  // Global scan buffer for kiosk mode: any RFID scan on the page triggers lookup directly
  // (unless user is actively typing in the Member ID input field)
  const handleScan = useCallback(
    (scannedMemberId: string) => {
      // Trigger lookup immediately without form interaction
      setSubmitErrorMessage(null)
      setSubmitSuccessMessage(null)
      clearLookupError()
      void runMemberLookupSubmit({ memberId: scannedMemberId })
      focusMemberIdInput()
    },
    [clearLookupError, runMemberLookupSubmit, focusMemberIdInput],
  )
  useScanBuffer(handleScan, isRfidCaptureActive, memberIdInputRef)

  // Kiosk inactivity timeout: clear all user data after 3 minutes of no activity
  // Prevents data residue on shared public kiosk terminals
  const handleKioskReset = useCallback(() => {
    clearMember()
    lookupForm.reset({ memberId: '' })
    dynamicForm.reset({})
    setSubmitErrorMessage(null)
    setSubmitSuccessMessage(null)
    clearLookupError()
  }, [clearMember, lookupForm, dynamicForm, clearLookupError])
  useKioskInactivityReset(handleKioskReset, 3 * 60 * 1000, isGateReady)

  const eventFieldsQuery = usePublicEventFieldsQuery(
    isDynamicFieldGateReady ? availability?.event.id : undefined,
  )

  const activeFields = useMemo(
    () => eventFieldsQuery.data?.validFields ?? [],
    [eventFieldsQuery.data?.validFields],
  )
  const responseSchema = useMemo(() => {
    return buildDynamicFieldResponseSchema(activeFields)
  }, [activeFields])

  // Consolidated effect: Handle form refill when fields or member prefill data changes.
  // Clears errors in the same cycle to avoid race conditions during form updates.
  useEffect(() => {
    const defaults = createDynamicFieldDefaultValues(activeFields)
    const merged = memberLookup.prefillResponses
      ? { ...defaults, ...memberLookup.prefillResponses }
      : defaults
    dynamicForm.reset(merged, {
      keepDefaultValues: false,
    })
    // Clear errors in the same effect cycle to prevent race conditions
    dynamicForm.clearErrors()
  }, [activeFields, memberLookup.prefillResponses, dynamicForm])

  // Consolidated effect: Handle gate closure cleanup.
  // When gate closes, reset all form and submission state atomically.
  useEffect(() => {
    if (!isDynamicFieldGateReady) {
      dynamicForm.reset({})
    }
  }, [dynamicForm, isDynamicFieldGateReady])

  const handleLookupSubmit = useCallback(
    async (values: Parameters<typeof runMemberLookupSubmit>[0]) => {
      setSubmitErrorMessage(null)
      setSubmitSuccessMessage(null)
      clearLookupError()
      const result = await runMemberLookupSubmit(values)
      focusMemberIdInput()

      if (!result.success) {
        showLookupError(result.error || 'Member lookup failed')
        return
      }
    },
    [clearLookupError, runMemberLookupSubmit, focusMemberIdInput, showLookupError],
  )

  async function handleSubmitRegistration(values: DynamicFieldResponseValues) {
    setSubmitErrorMessage(null)
    setSubmitSuccessMessage(null)

    // Validate form data
    const parsed = responseSchema.safeParse(values)
    if (!parsed.success) {
      logger.warn('Form validation failed:', parsed.error.issues)
      parsed.error.issues.forEach((issue: z.ZodIssue) => {
        const key = issue.path[0]
        if (typeof key === 'string') {
          dynamicForm.setError(key, {
            message: issue.message,
            type: 'manual',
          })
        }
      })
      return
    }

    // Check prerequisites
    if (!slug) {
      setSubmitErrorMessage('Event slug is missing')
      logger.error('Event slug is missing')
      return
    }

    if (!memberLookup.matchedMember || !memberLookup.verifiedMemberId) {
      setSubmitErrorMessage('Member lookup is required')
      logger.error('Member lookup missing at submission time')
      return
    }

    if (!availability || availability.status !== 'available' || !availability.event) {
      setSubmitErrorMessage('Event is not available')
      logger.error('Event not available:', availability)
      return
    }

    // Generate idempotency key for safe retries
    const idempotencyKey = crypto.randomUUID()

    logger.info('Submitting registration:', {
      event_slug: slug,
      member_id: memberLookup.verifiedMemberId,
      idempotency_key: idempotencyKey,
    })

    // Submit registration through secure RPC
    const result = await submitMutation.mutateAsync({
      event_slug: slug,
      member_id: memberLookup.verifiedMemberId,
      responses: parsed.data,
      idempotency_key: idempotencyKey,
    })

    if (!result.success) {
      logger.error('Registration submission failed:', result)
      // Handle specific error cases
      if (result.error_code === 'duplicate_blocked') {
        setSubmitErrorMessage('You have already registered for this event.')
        toast.error('Already registered for this event')
      } else {
        setSubmitErrorMessage(result.error || 'Failed to submit registration')
        toast.error(result.error || 'Failed to submit registration')
      }
      return
    }

    // Success
    setSubmitSuccessMessage(`Registration submitted successfully. ID: ${result.registration_id}`)
    toast.success('Registration submitted successfully!')
    logger.info('Registration submission successful:', result)

    // Reset the form and member state so the page is ready for another registration
    memberLookup.reset()
    dynamicForm.reset(createDynamicFieldDefaultValues(activeFields))
    focusMemberIdInput()
  }

  function fieldErrorMessage(fieldKey: string): string | undefined {
    const maybeError = dynamicForm.formState.errors[fieldKey]
    if (!maybeError) {
      return undefined
    }

    if (typeof maybeError.message === 'string') {
      return maybeError.message
    }

    return 'This field is invalid.'
  }

  function handleCancelUpdate() {
    dynamicForm.reset(createDynamicFieldDefaultValues(activeFields))
    memberLookup.reset()
    clearLookupError()
    setSubmitErrorMessage(null)
    setSubmitSuccessMessage(null)
    focusMemberIdInput()
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <EventHeaderCard
        slug={slug}
        isLoading={eventQuery.isLoading}
        isError={eventQuery.isError}
        availability={availability}
        isGateReady={isGateReady}
        eventWindowText={eventWindowText}
      />

      {isGateReady ? (
        <div className="space-y-6">
          <MemberLookupStepCard
            lookupForm={memberLookup.lookupForm}
            onLookupSubmit={handleLookupSubmit}
            isLookupPending={memberLookup.isLookupPending}
            lookupErrorMessage={lookupErrorMessage}
            shouldFadeLookupError={lookupErrorFadeOut}
            memberIdInputRef={memberIdInputRef}
            shouldHighlightInput={memberLookup.memberIdHighlight}
          />

          <ProfileStepCard
            matchedMember={memberLookup.matchedMember}
            shouldFadeDetails={memberLookup.isRegistrationBlocked && lookupErrorFadeOut}
          />

          <DynamicFieldsStepCard
            matchedMember={memberLookup.matchedMember}
            isLocked={memberLookup.isRegistrationBlocked}
            lockedMessage={memberLookup.lockedStepMessage}
            onCancelUpdate={handleCancelUpdate}
            isLoadingFields={eventFieldsQuery.isLoading}
            isFieldsError={eventFieldsQuery.isError}
            fieldConfigIssues={eventFieldsQuery.data?.issues ?? []}
            activeFields={activeFields}
            dynamicForm={dynamicForm}
            onSubmit={handleSubmitRegistration}
            fieldErrorMessage={fieldErrorMessage}
            isSubmitPending={submitMutation.isPending}
            submitButtonLabel={memberLookup.isUpdateMode ? 'Update' : 'Submit Registration'}
            submitErrorMessage={submitErrorMessage}
            submitSuccessMessage={submitSuccessMessage}
          />
        </div>
      ) : (
        <LockedGateCard />
      )}
    </section>
  )
}
