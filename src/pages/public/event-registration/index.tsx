import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  buildDynamicFieldResponseSchema,
  createDynamicFieldDefaultValues,
  type DynamicFieldResponseValues,
  type MemberLookupProfile,
} from '../../../lib/event-registration'
import { logger } from '../../../lib/logger'
import {
  usePublicEventQuery,
  usePublicEventFieldsQuery,
  useMemberLookupMutation,
  useSubmitRegistrationMutation,
  useRfidAutoFocus,
} from '../../../hooks/event-registration'
import {
  DynamicFieldsStepCard,
  EventHeaderCard,
  LockedGateCard,
  MemberLookupStepCard,
  ProfileStepCard,
} from './components'

const memberLookupSchema = z.object({
  memberId: z.string().trim().min(1, 'Member ID is required').max(64, 'Member ID is too long'),
})

type MemberLookupFormValues = z.infer<typeof memberLookupSchema>

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
  const [matchedMember, setMatchedMember] = useState<MemberLookupProfile | null>(null)
  const [verifiedMemberId, setVerifiedMemberId] = useState<string | null>(null)
  const [memberIdHighlight, setMemberIdHighlight] = useState(false)
  const [isRegistrationBlocked, setIsRegistrationBlocked] = useState(false)
  const [isUpdateMode, setIsUpdateMode] = useState(false)
  const [lockedStepMessage, setLockedStepMessage] = useState<string | null>(null)
  const [prefillResponses, setPrefillResponses] = useState<Record<string, unknown> | null>(null)
  const [lookupErrorMessage, setLookupErrorMessage] = useState<string | null>(null)
  const [lookupErrorFadeOut, setLookupErrorFadeOut] = useState(false)
  const [autoClearLookupError, setAutoClearLookupError] = useState(false)
  const [fieldConfigIssues, setFieldConfigIssues] = useState<string[]>([])
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null)
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null)

  const submitMutation = useSubmitRegistrationMutation()

  const eventQuery = usePublicEventQuery(slug)

  const lookupForm = useForm<MemberLookupFormValues>({
    resolver: zodResolver(memberLookupSchema),
    defaultValues: {
      memberId: '',
    },
  })

  const lookupMutation = useMemberLookupMutation()

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
  const isDynamicFieldGateReady = isGateReady && Boolean(matchedMember) && !isRegistrationBlocked

  // RFID reader support: keep the member ID input focused when no member has
  // been looked up yet so a card tap registers immediately.
  const isRfidCaptureActive = isGateReady && matchedMember === null && !lookupMutation.isPending
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

  const activeFields = eventFieldsQuery.data?.validFields ?? []
  const responseSchema = useMemo(() => {
    return buildDynamicFieldResponseSchema(activeFields)
  }, [activeFields])

  useEffect(() => {
    const defaults = createDynamicFieldDefaultValues(activeFields)
    const merged = prefillResponses ? { ...defaults, ...prefillResponses } : defaults
    dynamicForm.reset(merged, {
      keepDefaultValues: false,
    })
  }, [activeFields, prefillResponses])

  useEffect(() => {
    dynamicForm.clearErrors()
  }, [responseSchema, dynamicForm])

  useEffect(() => {
    setFieldConfigIssues(eventFieldsQuery.data?.issues ?? [])
  }, [eventFieldsQuery.data?.issues])

  useEffect(() => {
    if (!isDynamicFieldGateReady) {
      dynamicForm.reset({})
      setVerifiedMemberId(null)
      setPrefillResponses(null)
      setIsUpdateMode(false)
      setFieldConfigIssues([])
      setSubmitErrorMessage(null)
    }
  }, [dynamicForm, isDynamicFieldGateReady])

  useEffect(() => {
    if (isGateReady) {
      focusMemberIdInput()
    }
  }, [isGateReady])

  useEffect(() => {
    if (!autoClearLookupError || !lookupErrorMessage) {
      return
    }

    const fadeTimeout = setTimeout(() => {
      setLookupErrorFadeOut(true)
    }, 4500)

    const clearTimeoutId = setTimeout(() => {
      setLookupErrorMessage(null)
      setLookupErrorFadeOut(false)
      setAutoClearLookupError(false)
      setMatchedMember(null)
      setIsRegistrationBlocked(false)
      setLockedStepMessage(null)
      setMemberIdHighlight(false)
      focusMemberIdInput()
    }, 5000)

    return () => {
      clearTimeout(fadeTimeout)
      clearTimeout(clearTimeoutId)
    }
  }, [autoClearLookupError, lookupErrorMessage])

  async function handleLookupSubmit(values: MemberLookupFormValues) {
    setLookupErrorMessage(null)
    setLookupErrorFadeOut(false)
    setAutoClearLookupError(false)
    setLockedStepMessage(null)
    setMatchedMember(null)
    setVerifiedMemberId(null)
    setPrefillResponses(null)
    setIsRegistrationBlocked(false)
    setIsUpdateMode(false)
    setMemberIdHighlight(false)
    setFieldConfigIssues([])
    setSubmitErrorMessage(null)

    try {
      logger.info('Member lookup attempt:', values.memberId)
      const result = await lookupMutation.mutateAsync({
        memberId: values.memberId,
        eventSlug: slug,
      })

      if (!result.profile) {
        setMatchedMember(null)
        setVerifiedMemberId(null)
        setLookupErrorMessage('We could not verify that ID. Check it and try again.')
        setLookupErrorFadeOut(false)
        setAutoClearLookupError(true)
        lookupForm.reset()
        focusMemberIdInput()
        logger.warn('Member lookup returned null for ID:', values.memberId)
        return
      }

      if (result.existing_registration?.exists && !result.existing_registration.edit_allowed) {
        setMatchedMember(result.profile)
        setVerifiedMemberId(null)
        setIsRegistrationBlocked(true)
        setIsUpdateMode(false)
        setPrefillResponses(null)
        setLookupErrorMessage('You are already registered for this event.')
        setLookupErrorFadeOut(false)
        setAutoClearLookupError(true)
        setLockedStepMessage('Already registered for this event. Verify another member ID.')
        setMemberIdHighlight(true)
        lookupForm.reset()
        focusMemberIdInput()
        logger.info('Duplicate registration blocked during lookup:', values.memberId)
        return
      }

      setMatchedMember(result.profile)
      setVerifiedMemberId(values.memberId)
      setIsRegistrationBlocked(false)
      setIsUpdateMode(Boolean(result.existing_registration?.edit_allowed))
      setPrefillResponses(result.existing_registration?.responses ?? null)
      setMemberIdHighlight(Boolean(result.existing_registration?.edit_allowed))
      setLookupErrorMessage(null)
      setLookupErrorFadeOut(false)
      setAutoClearLookupError(false)

      if (result.existing_registration?.edit_allowed) {
        focusMemberIdInput()
      }

      logger.info('Member lookup successful:', result.profile)
    } catch (error) {
      setMatchedMember(null)
      setVerifiedMemberId(null)
      setIsRegistrationBlocked(false)
      setLookupErrorMessage('Lookup is unavailable right now. Please try again in a moment.')
      setLookupErrorFadeOut(false)
      setAutoClearLookupError(false)
      logger.error('Member lookup failed:', error)
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

    if (!matchedMember || !verifiedMemberId) {
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
      member_id: verifiedMemberId,
      idempotency_key: idempotencyKey,
    })

    // Submit registration through secure RPC
    const result = await submitMutation.mutateAsync({
      event_slug: slug,
      member_id: verifiedMemberId,
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
    lookupForm.reset()
    dynamicForm.reset(createDynamicFieldDefaultValues(activeFields))
    setMatchedMember(null)
    setVerifiedMemberId(null)
    setPrefillResponses(null)
    setIsRegistrationBlocked(false)
    setIsUpdateMode(false)
    setMemberIdHighlight(false)
    setLockedStepMessage(null)
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
            lookupForm={lookupForm}
            onLookupSubmit={handleLookupSubmit}
            isLookupPending={lookupMutation.isPending}
            lookupErrorMessage={lookupErrorMessage}
            shouldFadeLookupError={lookupErrorFadeOut}
            memberIdInputRef={memberIdInputRef}
            shouldHighlightInput={memberIdHighlight}
          />

          <ProfileStepCard
            matchedMember={matchedMember}
            shouldFadeDetails={isRegistrationBlocked && lookupErrorFadeOut}
          />

          <DynamicFieldsStepCard
            matchedMember={matchedMember}
            isLocked={isRegistrationBlocked}
            lockedMessage={lockedStepMessage}
            isLoadingFields={eventFieldsQuery.isLoading}
            isFieldsError={eventFieldsQuery.isError}
            fieldConfigIssues={fieldConfigIssues}
            activeFields={activeFields}
            dynamicForm={dynamicForm}
            onSubmit={handleSubmitRegistration}
            fieldErrorMessage={fieldErrorMessage}
            isSubmitPending={submitMutation.isPending}
            submitButtonLabel={isUpdateMode ? 'Update' : 'Submit Registration'}
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
