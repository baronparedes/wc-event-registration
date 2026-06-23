import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  buildDynamicFieldResponseSchema,
  createDynamicFieldDefaultValues,
  type DynamicFieldResponseValues,
} from '../../../lib/event-registration'
import { logger } from '../../../lib/logger'
import {
  usePublicEventQuery,
  usePublicEventFieldsQuery,
  useSubmitRegistrationMutation,
  useRfidAutoFocus,
  useErrorWithFadeout,
  useMemberLookupState,
} from '../../../hooks/event-registration'
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

  const submitMutation = useSubmitRegistrationMutation()
  const eventQuery = usePublicEventQuery(slug)

  // Extract lookup error handling
  const {
    error: lookupErrorMessage,
    isFadingOut: lookupErrorFadeOut,
    showError: showLookupError,
    clearError: clearLookupError,
  } = useErrorWithFadeout({
    fadeOutDelay: 4500,
    clearDelay: 5000,
    onClear: () => {
      memberLookup.clearMember()
      focusMemberIdInput()
    },
  })

  // Extract member lookup state and logic
  const memberLookup = useMemberLookupState(slug)

  const availability = eventQuery.data

  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: {},
  })

  const eventWindowText = useMemo(() => {
    if (!availability || availability.status !== 'available') {
      return null
    }

    return {
      opens: formatUtcDateTime(availability.event.registration_opens_at),
      closes: formatUtcDateTime(availability.event.registration_closes_at),
    }
  }, [availability])

  const isGateReady = availability?.status === 'available'
  const isDynamicFieldGateReady =
    isGateReady && Boolean(memberLookup.matchedMember) && !memberLookup.isRegistrationBlocked

  // RFID reader support: keep the member ID input focused when no member has
  // been looked up yet so a card tap registers immediately.
  const isRfidCaptureActive =
    isGateReady && memberLookup.matchedMember === null && !memberLookup.isLookupPending
  useRfidAutoFocus(memberIdInputRef, isRfidCaptureActive)

  const focusMemberIdInput = () => {
    requestAnimationFrame(() => {
      memberIdInputRef.current?.focus()
    })

    // Retry once after paint to handle late mount/layout timing.
    setTimeout(() => {
      memberIdInputRef.current?.focus()
    }, 120)
  }

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

  useEffect(() => {
    const defaults = createDynamicFieldDefaultValues(activeFields)
    const merged = memberLookup.prefillResponses
      ? { ...defaults, ...memberLookup.prefillResponses }
      : defaults
    dynamicForm.reset(merged, {
      keepDefaultValues: false,
    })
  }, [activeFields, memberLookup.prefillResponses, dynamicForm])

  useEffect(() => {
    dynamicForm.clearErrors()
  }, [responseSchema, dynamicForm])

  useEffect(() => {
    if (!isDynamicFieldGateReady) {
      dynamicForm.reset({})
      // Reset state atomically when gate closes - intentional cleanup pattern
      // eslint-disable-next-line
      setSubmitErrorMessage(null)
      setSubmitSuccessMessage(null)
    }
  }, [dynamicForm, isDynamicFieldGateReady])

  async function handleLookupSubmit(values: Parameters<typeof memberLookup.handleLookupSubmit>[0]) {
    clearLookupError()
    const result = await memberLookup.handleLookupSubmit(values)

    if (!result.success) {
      showLookupError(result.error || 'Member lookup failed')
      return
    }
  }

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
