import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { z } from 'zod'
import { toast } from 'sonner'
import { FORM_MESSAGES, TIMING, TOAST_MESSAGES } from '@/config/constants'
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
  useErrorWithFadeout,
  useKioskInactivityReset,
  useRfidAutoFocus,
  useScanBuffer,
} from '@/hooks/utils'

export type RegistrationLayoutVariant = 'classic' | 'wizard'
export type WizardStep = 1 | 2 | 3

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

export function stepBadgeClassName(currentStep: WizardStep, badgeStep: WizardStep): string {
  if (currentStep === badgeStep) {
    return 'bg-primary text-white ring-2 ring-primary/25'
  }

  if (currentStep > badgeStep) {
    return 'bg-secondary text-white'
  }

  return 'bg-surface text-muted border border-border'
}

export function useEventRegistrationPageState(variant: RegistrationLayoutVariant) {
  const { slug } = useParams<{ slug: string }>()
  const memberIdInputRef = useRef<HTMLInputElement | null>(null)
  const dynamicFieldsStepRef = useRef<HTMLDivElement | null>(null)
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null)
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null)
  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [wizardConfirmSecondsRemaining, setWizardConfirmSecondsRemaining] = useState<number | null>(
    null,
  )

  const submitMutation = useSubmitRegistrationMutation()
  const eventQuery = usePublicEventQuery(slug)
  const memberLookup = useMemberLookupState(slug)
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    defaultValues: {},
  })

  const { clearMember, lookupForm, handleLookupSubmit: runMemberLookupSubmit } = memberLookup

  const activeWizardStep = useMemo<WizardStep>(() => {
    if (variant !== 'wizard') {
      return 1
    }

    if (wizardStep === 1 && memberLookup.matchedMember) {
      return memberLookup.isRegistrationBlocked ? 2 : 3
    }

    return wizardStep
  }, [variant, wizardStep, memberLookup.matchedMember, memberLookup.isRegistrationBlocked])

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

  const isRfidCaptureActive =
    isGateReady &&
    (variant === 'classic' || activeWizardStep === 1) &&
    memberLookup.matchedMember === null &&
    !memberLookup.isLookupPending
  const focusMemberIdInput = useRfidAutoFocus(memberIdInputRef, isRfidCaptureActive)

  const {
    error: lookupErrorMessage,
    isFadingOut: lookupErrorFadeOut,
    showError: showLookupError,
    clearError: clearLookupError,
  } = useErrorWithFadeout({
    fadeOutDelay: TIMING.registrationLookupFadeOutDelayMs,
    clearDelay: TIMING.registrationLookupClearDelayMs,
    autoFadeOut: false,
    onFadeStart: () => {
      const scrollBehavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)')
        .matches
        ? 'auto'
        : 'auto'
      document.getElementById('app-shell-title-anchor')?.scrollIntoView({
        behavior: scrollBehavior,
        block: 'start',
      })
    },
    onClear: () => {
      clearMember()
    },
  })

  const scrollToTitleAnchor = useCallback(() => {
    const scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'
    document.getElementById('app-shell-title-anchor')?.scrollIntoView({
      behavior: scrollBehavior,
      block: 'start',
    })
  }, [])

  const scrollToDynamicFieldsStep = useCallback(() => {
    const scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth'
    dynamicFieldsStepRef.current?.scrollIntoView({
      behavior: scrollBehavior,
      block: 'start',
    })
  }, [])

  const enterWizardConfirmStep = useCallback(() => {
    setWizardConfirmSecondsRemaining(TIMING.registrationWizardConfirmTimeoutMs / 1000)
    setWizardStep(2)
  }, [])

  const enterWizardCompleteStep = useCallback(() => {
    setWizardConfirmSecondsRemaining(null)
    setWizardStep(3)
    scrollToDynamicFieldsStep()
  }, [scrollToDynamicFieldsStep])

  const resetToStepOne = useCallback(() => {
    clearMember()
    lookupForm.reset({ memberId: '' })
    setSubmitErrorMessage(null)
    setSubmitSuccessMessage(null)
    setWizardConfirmSecondsRemaining(null)
    clearLookupError()
    setWizardStep(1)
    focusMemberIdInput()
  }, [clearMember, lookupForm, clearLookupError, focusMemberIdInput])

  const handleLookupSuccess = useCallback(
    (mode: 'new_registration' | 'update_registration') => {
      if (variant === 'wizard') {
        enterWizardConfirmStep()
        return
      }

      if (mode === 'update_registration') {
        scrollToDynamicFieldsStep()
        return
      }

      focusMemberIdInput()
    },
    [variant, enterWizardConfirmStep, scrollToDynamicFieldsStep, focusMemberIdInput],
  )

  const handleLookupFailure = useCallback(
    (error: string, autoFadeOut: boolean) => {
      setWizardStep(1)
      focusMemberIdInput()
      showLookupError(error, { autoFadeOut })
    },
    [focusMemberIdInput, showLookupError],
  )

  const handleScan = useCallback(
    async (scannedMemberId: string) => {
      setSubmitErrorMessage(null)
      setSubmitSuccessMessage(null)
      clearLookupError()
      const result = await runMemberLookupSubmit({ memberId: scannedMemberId })

      if (!result.success) {
        handleLookupFailure(
          result.error || FORM_MESSAGES.memberLookupFailed,
          result.reason === 'already_registered',
        )
        return
      }

      handleLookupSuccess(result.mode)
    },
    [clearLookupError, runMemberLookupSubmit, handleLookupFailure, handleLookupSuccess],
  )
  useScanBuffer(handleScan, isRfidCaptureActive, memberIdInputRef)

  const handleKioskReset = useCallback(() => {
    clearMember()
    lookupForm.reset({ memberId: '' })
    dynamicForm.reset({})
    setSubmitErrorMessage(null)
    setSubmitSuccessMessage(null)
    setWizardConfirmSecondsRemaining(null)
    clearLookupError()
    setWizardStep(1)
  }, [clearMember, lookupForm, dynamicForm, clearLookupError])
  useKioskInactivityReset(handleKioskReset, TIMING.kioskInactivityResetMs, isGateReady)

  const eventFieldsQuery = usePublicEventFieldsQuery(
    isDynamicFieldGateReady ? availability?.event.id : undefined,
  )

  const activeFields = useMemo(
    () => eventFieldsQuery.data?.validFields ?? [],
    [eventFieldsQuery.data?.validFields],
  )
  const responseSchema = useMemo(
    () => buildDynamicFieldResponseSchema(activeFields),
    [activeFields],
  )

  useEffect(() => {
    const defaults = createDynamicFieldDefaultValues(activeFields)
    const merged = memberLookup.prefillResponses
      ? { ...defaults, ...memberLookup.prefillResponses }
      : defaults
    dynamicForm.reset(merged, {
      keepDefaultValues: false,
    })
    dynamicForm.clearErrors()
  }, [activeFields, memberLookup.prefillResponses, dynamicForm])

  useEffect(() => {
    if (!isDynamicFieldGateReady) {
      dynamicForm.reset({})
    }
  }, [dynamicForm, isDynamicFieldGateReady])

  useEffect(() => {
    if (variant !== 'wizard' || activeWizardStep !== 2) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      resetToStepOne()
    }, TIMING.registrationWizardConfirmTimeoutMs)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [variant, activeWizardStep, resetToStepOne])

  useEffect(() => {
    if (variant !== 'wizard' || activeWizardStep !== 2 || wizardConfirmSecondsRemaining === null) {
      return
    }

    const intervalId = window.setInterval(() => {
      setWizardConfirmSecondsRemaining((value) => {
        if (value === null) {
          return null
        }

        return value > 1 ? value - 1 : 1
      })
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [variant, activeWizardStep, wizardConfirmSecondsRemaining])

  const handleLookupSubmit = useCallback(
    async (values: Parameters<typeof runMemberLookupSubmit>[0]) => {
      setSubmitErrorMessage(null)
      setSubmitSuccessMessage(null)
      clearLookupError()
      const result = await runMemberLookupSubmit(values)

      if (!result.success) {
        handleLookupFailure(
          result.error || FORM_MESSAGES.memberLookupFailed,
          result.reason === 'already_registered',
        )
        return
      }

      handleLookupSuccess(result.mode)
    },
    [clearLookupError, runMemberLookupSubmit, handleLookupFailure, handleLookupSuccess],
  )

  const handleSubmitRegistration = useCallback(
    async (values: DynamicFieldResponseValues) => {
      setSubmitErrorMessage(null)
      setSubmitSuccessMessage(null)

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

      if (!slug) {
        setSubmitErrorMessage(FORM_MESSAGES.eventSlugMissing)
        logger.error('Event slug is missing')
        return
      }

      if (!memberLookup.matchedMember || !memberLookup.verifiedMemberId) {
        setSubmitErrorMessage(FORM_MESSAGES.memberLookupRequired)
        logger.error('Member lookup missing at submission time')
        return
      }

      if (!availability || availability.status !== 'available' || !availability.event) {
        setSubmitErrorMessage(FORM_MESSAGES.eventNotAvailable)
        logger.error('Event not available:', availability)
        return
      }

      const idempotencyKey = crypto.randomUUID()

      logger.info('Submitting registration:', {
        event_slug: slug,
        member_id: memberLookup.verifiedMemberId,
        idempotency_key: idempotencyKey,
      })

      const result = await submitMutation.mutateAsync({
        event_slug: slug,
        member_id: memberLookup.verifiedMemberId,
        responses: parsed.data,
        idempotency_key: idempotencyKey,
      })

      if (!result.success) {
        logger.error('Registration submission failed:', result)
        if (result.error_code === 'duplicate_blocked') {
          setSubmitErrorMessage('You have already registered for this event.')
          toast.error(TOAST_MESSAGES.registration.alreadyRegistered)
        } else {
          setSubmitErrorMessage(result.error || TOAST_MESSAGES.registration.submitFailed)
          toast.error(result.error || TOAST_MESSAGES.registration.submitFailed)
        }
        return
      }

      setSubmitSuccessMessage(`Registration submitted successfully. ID: ${result.registration_id}`)
      toast.success(TOAST_MESSAGES.registration.submitted)
      logger.info('Registration submission successful:', result)

      const wasUpdateMode = memberLookup.isUpdateMode

      memberLookup.reset()
      dynamicForm.reset(createDynamicFieldDefaultValues(activeFields))
      setWizardConfirmSecondsRemaining(null)
      setWizardStep(1)

      if (wasUpdateMode) {
        scrollToTitleAnchor()
        return
      }

      focusMemberIdInput()
    },
    [
      responseSchema,
      slug,
      memberLookup,
      availability,
      submitMutation,
      activeFields,
      dynamicForm,
      scrollToTitleAnchor,
      focusMemberIdInput,
    ],
  )

  const fieldErrorMessage = useCallback(
    (fieldKey: string): string | undefined => {
      const maybeError = dynamicForm.formState.errors[fieldKey]
      if (!maybeError) {
        return undefined
      }

      if (typeof maybeError.message === 'string') {
        return maybeError.message
      }

      return 'This field is invalid.'
    },
    [dynamicForm.formState.errors],
  )

  const handleCancelUpdate = useCallback(() => {
    dynamicForm.reset(createDynamicFieldDefaultValues(activeFields))
    memberLookup.reset()
    clearLookupError()
    setSubmitErrorMessage(null)
    setSubmitSuccessMessage(null)
    setWizardConfirmSecondsRemaining(null)
    setWizardStep(1)
    scrollToTitleAnchor()
  }, [dynamicForm, activeFields, memberLookup, clearLookupError, scrollToTitleAnchor])

  return {
    slug,
    availability,
    eventQuery,
    eventWindowText,
    isGateReady,
    memberLookup,
    memberIdInputRef,
    dynamicFieldsStepRef,
    lookupErrorMessage,
    lookupErrorFadeOut,
    clearLookupError,
    activeFields,
    eventFieldsQuery,
    dynamicForm,
    submitMutation,
    submitErrorMessage,
    submitSuccessMessage,
    handleLookupSubmit,
    handleSubmitRegistration,
    fieldErrorMessage,
    handleCancelUpdate,
    resetToStepOne,
    activeWizardStep,
    wizardConfirmSecondsRemaining,
    enterWizardConfirmStep,
    enterWizardCompleteStep,
    setWizardStep,
    scrollToDynamicFieldsStep,
  }
}
