import { useCallback, useEffect, useRef, useState } from 'react';

import { AlertCircle, Calendar } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { EmptyState } from '@/components/ui/EmptyState';
import { EventHeaderCard } from '@/components/ui/EventHeaderCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { TIMING, TOAST_MESSAGES, toEventRegistration } from '@/config/constants';
import { usePublicEventFieldsQuery } from '@/hooks/domain/event-fields/queries';
import { usePublicEventQuery } from '@/hooks/domain/events/queries';
import {
  fetchPublicAttendeeCheck,
  fetchPublicRegistrationDetail,
  useSubmitPublicRegistrationMutation,
} from '@/hooks/domain/public-registrations';
import { useWizardStepScroll } from '@/hooks/utils';
import type { DynamicFieldResponseValues } from '@/lib/domain/event-fields';
import { derivePublicRegistrationAccess } from '@/lib/domain/events';
import type { PublicAttendeeInfoInput } from '@/lib/domain/public-registrations';
import { buildSubmitPublicRegistrationSchema } from '@/lib/domain/public-registrations';
import { formatDateTime } from '@/lib/infrastructure';

import {
  PublicAttendeeInfoStep,
  PublicEventFieldsStep,
  PublicRegistrationConfirmationStep,
} from './components';

type Step = 'attendee-info' | 'event-fields' | 'confirmation';

interface RouteParams extends Record<string, string | undefined> {
  slug?: string;
}

export function PublicEventRegistrationPage() {
  const { slug } = useParams<RouteParams>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('attendee-info');

  const stepOneRef = useRef<HTMLDivElement | null>(null);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);
  const stepThreeRef = useRef<HTMLDivElement | null>(null);

  // Auto-redirect to member registration after 3 minutes of inactivity
  const handleInactivityReset = useCallback(() => {
    if (slug) {
      navigate(toEventRegistration(slug));
    }
  }, [slug, navigate]);

  const [attendeeInfo, setAttendeeInfo] = useState<PublicAttendeeInfoInput | null>(null);
  const [attendeeEmailErrorMessage, setAttendeeEmailErrorMessage] = useState<string | null>(null);
  const [isCheckingAttendee, setIsCheckingAttendee] = useState(false);
  const [fieldResponses, setFieldResponses] = useState<DynamicFieldResponseValues>({});
  const [confirmationData, setConfirmationData] = useState<{
    registrationId: string;
    email: string;
  } | null>(null);
  const hasShownFieldsErrorToastRef = useRef(false);

  const eventQuery = usePublicEventQuery(slug ?? null);
  const availableEventId =
    eventQuery.data?.status === 'available' && eventQuery.data.event
      ? eventQuery.data.event.id
      : undefined;

  const fieldsQuery = usePublicEventFieldsQuery(availableEventId);
  const submitMutation = useSubmitPublicRegistrationMutation();

  useEffect(() => {
    if (
      currentStep === 'event-fields' &&
      fieldsQuery.isError &&
      !hasShownFieldsErrorToastRef.current
    ) {
      toast.error('Failed to load event fields. Please try again.');
      hasShownFieldsErrorToastRef.current = true;
      return;
    }

    if (!fieldsQuery.isError) {
      hasShownFieldsErrorToastRef.current = false;
    }
  }, [currentStep, fieldsQuery.isError]);

  // Define step number before hook call
  const getStepNumber = (): number => {
    if (currentStep === 'attendee-info') return 1;
    if (currentStep === 'event-fields') return 2;
    return 3;
  };

  useWizardStepScroll(getStepNumber(), [stepOneRef, stepTwoRef, stepThreeRef]);

  const handleAttendeeInfoSubmit = useCallback(
    async (data: PublicAttendeeInfoInput) => {
      if (!slug) {
        return;
      }

      setAttendeeEmailErrorMessage(null);
      setIsCheckingAttendee(true);

      try {
        const existingRegistration = await fetchPublicAttendeeCheck(data.email, slug);
        const allowsExistingRegistrationUpdate =
          eventQuery.data?.status === 'available' &&
          (eventQuery.data.event.duplicate_policy === 'allow_update' ||
            eventQuery.data.event.duplicate_policy === 'allow_multiple_update');

        if (existingRegistration && !allowsExistingRegistrationUpdate) {
          setAttendeeEmailErrorMessage('This email is already registered for this event.');
          return;
        }

        if (existingRegistration && allowsExistingRegistrationUpdate) {
          const detail = await fetchPublicRegistrationDetail(existingRegistration.id);
          const hydratedFieldResponses = detail.fieldResponses.reduce(
            (acc: DynamicFieldResponseValues, response) => {
              if (response.field_name) {
                acc[response.field_name] = response.answer;
              }
              return acc;
            },
            {} as DynamicFieldResponseValues,
          );

          setAttendeeInfo({
            first_name: detail.registration.first_name,
            last_name: detail.registration.last_name,
            nickname: detail.registration.nickname,
            email: detail.registration.email,
            phone: detail.registration.phone,
          });
          setFieldResponses(hydratedFieldResponses);
          setCurrentStep('event-fields');
          return;
        }

        setAttendeeInfo(data);
        setFieldResponses({});
        setCurrentStep('event-fields');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to check attendee';
        toast.error(message);
      } finally {
        setIsCheckingAttendee(false);
      }
    },
    [slug, eventQuery.data],
  );

  const handleFieldsSubmit = useCallback(
    async (responses: DynamicFieldResponseValues) => {
      if (!attendeeInfo || !eventQuery.data || !slug) return;

      setFieldResponses(responses);

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
            acc[key] = value;
          }
          return acc;
        }, {} as DynamicFieldResponseValues);

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
        };

        // Validate request structure
        const schema = buildSubmitPublicRegistrationSchema(fieldsQuery.data?.validFields || []);
        schema.parse(requestData);

        const result = await submitMutation.mutateAsync(requestData);

        if (result.success) {
          setConfirmationData({
            registrationId: result.registration_id,
            email: attendeeInfo.email,
          });
          setCurrentStep('confirmation');
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : TOAST_MESSAGES.registration.submitFailed;
        toast.error(message);
      }
    },
    [attendeeInfo, eventQuery.data, slug, fieldsQuery.data, submitMutation],
  );

  const handleBackToAttendeeInfo = useCallback(() => {
    setCurrentStep('attendee-info');
  }, []);

  if (!slug) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <EmptyState
          icon={<AlertCircle />}
          title="Invalid Request"
          description="No event specified."
        />
      </section>
    );
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
    );
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
    );
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
    );
  }

  if (eventQuery.data.status !== 'available' || !eventQuery.data.event.allow_public_registrations) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <EmptyState
          icon={<AlertCircle />}
          title="Public Registration Unavailable"
          description="This event is not accepting public registrations at the moment."
        />
      </section>
    );
  }

  const availableEvent = eventQuery.data.event;
  const publicRegistrationAccess = derivePublicRegistrationAccess({
    public_registration_access: availableEvent.metadata?.public_registration_access,
    allow_public_registrations: availableEvent.allow_public_registrations,
    require_id_lookup: availableEvent.require_id_lookup,
  });
  const canReturnToMemberRegistration = publicRegistrationAccess !== 'public';
  const canUpdatePublicRegistration =
    availableEvent.duplicate_policy === 'allow_update' ||
    availableEvent.duplicate_policy === 'allow_multiple_update';
  const eventWindowText =
    availableEvent.registration_opens_at && availableEvent.registration_closes_at
      ? {
          opens: formatDateTime(availableEvent.registration_opens_at),
          closes: formatDateTime(availableEvent.registration_closes_at),
        }
      : null;

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <EventHeaderCard
        defaultExpanded={false}
        slug={slug}
        isLoading={eventQuery.isLoading}
        isError={eventQuery.isError}
        availability={eventQuery.data}
        isGateReady={!!availableEvent.registration_opens_at}
        eventWindowText={eventWindowText}
      />

      <StepIndicator
        currentStep={getStepNumber()}
        totalSteps={3}
        labels={['Your Info', 'Event Details', 'Confirmation']}
      />

      {currentStep === 'attendee-info' && (
        <div ref={stepOneRef} className="space-y-4 scroll-mt-24">
          <PublicAttendeeInfoStep
            onSubmit={handleAttendeeInfoSubmit}
            isSubmitting={isCheckingAttendee}
            emailErrorMessage={attendeeEmailErrorMessage || undefined}
            defaultValues={attendeeInfo || undefined}
            inactivityTimeoutMs={TIMING.kioskInactivityResetMs}
            onInactivityTimeout={handleInactivityReset}
          />
          <div className="flex items-center justify-start">
            {canReturnToMemberRegistration && (
              <button
                type="button"
                onClick={() => slug && navigate(`/events/${slug}/register`)}
                className="text-sm text-muted underline transition hover:text-text"
              >
                ← Back to member registration
              </button>
            )}
          </div>
        </div>
      )}

      {currentStep === 'event-fields' && (
        <div ref={stepTwoRef} className="space-y-4 scroll-mt-24">
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
              inactivityTimeoutMs={TIMING.kioskInactivityResetMs}
              onInactivityTimeout={handleInactivityReset}
            />
          )}
        </div>
      )}

      {currentStep === 'confirmation' && confirmationData && (
        <div ref={stepThreeRef} className="space-y-4 scroll-mt-24">
          <PublicRegistrationConfirmationStep
            registrationId={confirmationData.registrationId}
            email={confirmationData.email}
            eventSlug={slug}
            canUpdate={canUpdatePublicRegistration}
            inactivityTimeoutMs={TIMING.publicRegistrationConfirmationTimeoutMs}
            onInactivityTimeout={handleInactivityReset}
          />
        </div>
      )}
    </section>
  );
}
