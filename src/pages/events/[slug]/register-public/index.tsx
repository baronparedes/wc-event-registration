import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { formatDateTime } from '@/lib/infrastructure'
import { TIMING, TOAST_MESSAGES, toEventRegistration } from '@/config/constants'
import { useKioskInactivityReset } from '@/hooks/utils'
import {
  fetchPublicAttendeeCheck,
  useSubmitPublicRegistrationMutation,
} from '@/hooks/domain/public-registrations'
import { usePublicEventQuery } from '@/hooks/domain/events/queries'
import { usePublicEventFieldsQuery } from '@/hooks/domain/event-fields/queries'
import {
  PublicAttendeeInfoStep,
  PublicEventFieldsStep,
  PublicRegistrationConfirmationStep,
} from './components'
import { EventHeaderCard } from '../register/components/EventHeaderCard'
import { SectionCard } from '@/components/ui/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { StepIndicator } from '@/components/ui/StepIndicator'
import { AlertCircle, Calendar } from 'lucide-react'
import type { PublicAttendeeInfoInput } from '@/lib/domain/public-registrations'
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields'
import { buildSubmitPublicRegistrationSchema } from '@/lib/domain/public-registrations'

type Step = 'attendee-info' | 'event-fields' | 'confirmation'

interface RouteParams extends Record<string, string | undefined> {
  slug?: string
}

export function PublicEventRegistrationPage() {
  const { slug } = useParams<RouteParams>()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<Step>('attendee-info')

  // Auto-redirect to member registration after 3 minutes of inactivity
  const handleInactivityReset = useCallback(() => {
    if (slug) {
      navigate(toEventRegistration(slug))
    }
  }, [slug, navigate])

  const isGuestRegistrationActive = currentStep !== 'confirmation'
  const { secondsRemaining } = useKioskInactivityReset(
    handleInactivityReset,
    TIMING.kioskInactivityResetMs,
    isGuestRegistrationActive,
  )
  const { secondsRemaining: confirmationSecondsRemaining } = useKioskInactivityReset(
    handleInactivityReset,
    TIMING.publicRegistrationConfirmationTimeoutMs,
    currentStep === 'confirmation',
  )
  const [attendeeInfo, setAttendeeInfo] = useState<PublicAttendeeInfoInput | null>(null)
  const [attendeeEmailErrorMessage, setAttendeeEmailErrorMessage] = useState<string | null>(null)
  const [isCheckingAttendee, setIsCheckingAttendee] = useState(false)
  const [fieldResponses, setFieldResponses] = useState<DynamicFieldResponseValues>({})
  const [confirmationData, setConfirmationData] = useState<{
    registrationId: string
    email: string
  } | null>(null)
  const hasShownFieldsErrorToastRef = useRef(false)

  const eventQuery = usePublicEventQuery(slug ?? null)
  const event =
    eventQuery.data?.status === 'available' && eventQuery.data.event ? eventQuery.data.event : null

  const fieldsQuery = usePublicEventFieldsQuery(event?.id)
  const submitMutation = useSubmitPublicRegistrationMutation()

  useEffect(() => {
    if (
      currentStep === 'event-fields' &&
      fieldsQuery.isError &&
      !hasShownFieldsErrorToastRef.current
    ) {
      toast.error('Failed to load event fields. Please try again.')
      hasShownFieldsErrorToastRef.current = true
      return
    }

    if (!fieldsQuery.isError) {
      hasShownFieldsErrorToastRef.current = false
    }
  }, [currentStep, fieldsQuery.isError])

  const handleAttendeeInfoSubmit = useCallback(
    async (data: PublicAttendeeInfoInput) => {
      if (!slug) {
        return
      }

      setAttendeeEmailErrorMessage(null)
      setIsCheckingAttendee(true)

      try {
        const existingRegistration = await fetchPublicAttendeeCheck(data.email, slug)

        if (existingRegistration) {
          setAttendeeEmailErrorMessage('This email is already registered for this event.')
          return
        }

        setAttendeeInfo(data)
        setCurrentStep('event-fields')
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to check attendee'
        toast.error(message)
      } finally {
        setIsCheckingAttendee(false)
      }
    },
    [slug],
  )

  const displayedSecondsRemaining =
    currentStep === 'confirmation' ? confirmationSecondsRemaining : secondsRemaining

  const handleFieldsSubmit = useCallback(
    async (responses: DynamicFieldResponseValues) => {
      if (!attendeeInfo || !eventQuery.data || !slug) return

      setFieldResponses(responses)

      try {
        // Build proper response object (exclude attendee fields)
        const fieldResponses = Object.entries(responses).reduce((acc, [key, value]) => {
          if (
            key !== 'first_name' &&
            key !== 'last_name' &&
            key !== 'nickname' &&
            key !== 'email' &&
            key !== 'phone'
          ) {
            acc[key] = value
          }
          return acc
        }, {} as DynamicFieldResponseValues)

        // Build and validate request data with proper structure
        const requestData = {
          event_slug: slug,
          attendee: {
            first_name: attendeeInfo.first_name,
            last_name: attendeeInfo.last_name,
            nickname: attendeeInfo.nickname || undefined,
            email: attendeeInfo.email,
            phone: attendeeInfo.phone || undefined,
          },
          responses: fieldResponses,
          idempotency_key: `${attendeeInfo.email}-${slug}-${Date.now()}`,
        }

        // Validate request structure
        const schema = buildSubmitPublicRegistrationSchema(fieldsQuery.data?.validFields || [])
        schema.parse(requestData)

        const result = await submitMutation.mutateAsync(requestData)

        if (result.success) {
          setConfirmationData({
            registrationId: result.registration_id,
            email: attendeeInfo.email,
          })
          setCurrentStep('confirmation')
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : TOAST_MESSAGES.registration.submitFailed
        toast.error(message)
      }
    },
    [attendeeInfo, eventQuery.data, slug, fieldsQuery.data, submitMutation],
  )

  const handleBackToAttendeeInfo = useCallback(() => {
    setCurrentStep('attendee-info')
  }, [])

  if (!slug) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <EmptyState
          icon={<AlertCircle />}
          title="Invalid Request"
          description="No event specified."
        />
      </section>
    )
  }

  if (eventQuery.isLoading) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <SectionCard title="Loading...">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
          </div>
        </SectionCard>
      </section>
    )
  }

  if (eventQuery.isError) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <EmptyState
          icon={<AlertCircle />}
          title="Registration Unavailable"
          description={eventQuery.error?.message || 'Unable to load event information'}
        />
      </section>
    )
  }

  if (!eventQuery.data) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <EmptyState
          icon={<Calendar />}
          title="Event Not Found"
          description="The event you're looking for does not exist or is not accepting registrations."
        />
      </section>
    )
  }

  const getStepNumber = (): number => {
    if (currentStep === 'attendee-info') return 1
    if (currentStep === 'event-fields') return 2
    return 3
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      {(() => {
        const isAvailable = eventQuery.data?.status === 'available'
        const availData = isAvailable
          ? (eventQuery.data as Extract<typeof eventQuery.data, { status: 'available' }>)
          : null
        const event = availData?.event

        return (
          <EventHeaderCard
            slug={slug}
            isLoading={eventQuery.isLoading}
            isError={eventQuery.isError}
            availability={eventQuery.data}
            isGateReady={!!event?.registration_opens_at}
            eventWindowText={
              // eslint-disable-next-line no-restricted-syntax
              event?.registration_opens_at && event?.registration_closes_at
                ? {
                    opens: formatDateTime(event.registration_opens_at),
                    closes: formatDateTime(event.registration_closes_at),
                  }
                : null
            }
          />
        )
      })()}

      <StepIndicator
        currentStep={getStepNumber()}
        totalSteps={3}
        labels={['Your Info', 'Event Details', 'Confirmation']}
      />

      {currentStep === 'attendee-info' && (
        <>
          <PublicAttendeeInfoStep
            onSubmit={handleAttendeeInfoSubmit}
            isSubmitting={isCheckingAttendee}
            emailErrorMessage={attendeeEmailErrorMessage || undefined}
            defaultValues={attendeeInfo || undefined}
          />
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => slug && navigate(`/events/${slug}/register`)}
              className="text-sm text-muted underline transition hover:text-text"
            >
              ← Back to member registration
            </button>
          </div>
        </>
      )}

      {currentStep === 'event-fields' && (
        <>
          {fieldsQuery.isLoading && (
            <SectionCard title="Step 2: Event Details">
              <div className="animate-pulse space-y-4">
                <div className="h-8 w-3/4 rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-full rounded bg-muted" />
              </div>
            </SectionCard>
          )}

          {!fieldsQuery.isLoading && !fieldsQuery.isError && fieldsQuery.data?.validFields && (
            <PublicEventFieldsStep
              fields={fieldsQuery.data.validFields}
              onSubmit={handleFieldsSubmit}
              onBack={handleBackToAttendeeInfo}
              isSubmitting={submitMutation.isPending}
              defaultValues={fieldResponses}
            />
          )}
        </>
      )}

      {currentStep === 'confirmation' && confirmationData && (
        <PublicRegistrationConfirmationStep
          registrationId={confirmationData.registrationId}
          email={confirmationData.email}
          eventSlug={slug}
        />
      )}

      {/* Inactivity timer */}
      {displayedSecondsRemaining && (
        <div className="mt-6 flex items-center justify-center">
          <p className="text-sm text-muted" aria-live="polite">
            Returning to member registration in {displayedSecondsRemaining}s if no one continues.
          </p>
        </div>
      )}
    </section>
  )
}
