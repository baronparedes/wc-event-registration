import { useRef } from 'react';

import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { EmptyState, SectionCard, StepIndicator } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { EventHeaderCard } from '@/components/ui/EventHeaderCard';
import { ROUTE_PATHS, TIMING } from '@/config/constants';
import { useWizardStepScroll } from '@/hooks/utils';
import { derivePublicRegistrationAccess } from '@/lib/domain/events';

import { DynamicFieldsStepCard, MemberLookupStepCard, ProfileStepCard } from './components';
import { useEventRegistrationPageState } from './hooks';

export function EventRegistrationPage() {
  const stepOneRef = useRef<HTMLDivElement | null>(null);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();

  const {
    slug,
    eventQuery,
    availability,
    isGateReady,
    eventWindowText,
    activeWizardStep,
    memberLookup,
    handleLookupSubmit,
    lookupErrorMessage,
    lookupErrorFadeOut,
    memberIdInputRef,
    clearLookupError,
    enterWizardCompleteStep,
    resetToStepOne,
    dynamicFieldsStepRef,
    eventFieldsQuery,
    activeFields,
    remainingSlotsByFieldOption,
    remainingSlotsByRoleByFieldOption,
    dynamicForm,
    handleSubmitRegistration,
    fieldErrorMessage,
    submitMutation,
    submitErrorMessage,
    submitSuccessMessage,
    isRegistrationConfirmed,
    handleCancelUpdate,
    enterWizardConfirmStep,
    isEffectiveRegistrationBlocked,
    shouldBypassDynamicFieldsStepCard,
  } = useEventRegistrationPageState();

  const publicRegistrationAccess =
    availability?.status === 'available'
      ? derivePublicRegistrationAccess({
          public_registration_access: availability!.event!.metadata?.public_registration_access,
          allow_public_registrations: availability!.event!.allow_public_registrations,
          require_id_lookup: availability!.event!.require_id_lookup,
        })
      : 'members';

  useWizardStepScroll(activeWizardStep, [stepOneRef, stepTwoRef, dynamicFieldsStepRef]);

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

  if (
    eventQuery.data?.status === 'unavailable' &&
    eventQuery.data?.reason === 'not_found_or_unpublished'
  ) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <EmptyState
          icon={<AlertCircle />}
          title="Registration Unavailable"
          description="This event is not available."
          action={
            <div className="flex gap-3 pt-2">
              <Button onClick={() => navigate(ROUTE_PATHS.home)} variant="default">
                Go Home
              </Button>
              <Button onClick={() => navigate(-1)} variant="outline">
                Go Back
              </Button>
            </div>
          }
        />
      </section>
    );
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
        defaultExpanded={false}
      />

      {!isGateReady && (
        <SectionCard
          title="Registration Is Not Open Yet"
          wrapperClassName="rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-6"
        >
          <p className="text-sm text-muted">
            This event is not accepting registrations right now. Please check back later.
          </p>
        </SectionCard>
      )}

      {isGateReady && (
        <div className="space-y-6">
          <StepIndicator
            currentStep={activeWizardStep}
            totalSteps={3}
            labels={['Scan', 'Confirm', 'Complete']}
          />

          {activeWizardStep === 1 && (
            <div ref={stepOneRef} className="scroll-mt-24">
              <MemberLookupStepCard
                slug={slug}
                lookupForm={memberLookup.lookupForm}
                onLookupSubmit={handleLookupSubmit}
                isLookupPending={memberLookup.isLookupPending}
                lookupErrorMessage={lookupErrorMessage}
                suppressLookupWarning={memberLookup.isRegistrationBlocked}
                memberIdInputRef={memberIdInputRef}
                shouldHighlightInput={memberLookup.memberIdHighlight}
                onDismissLookupError={clearLookupError}
                allowNameLookup={
                  availability?.status === 'available' && availability.event
                    ? Boolean(availability.event.metadata?.allow_name_lookup)
                    : false
                }
                allowMemberRegistration={publicRegistrationAccess !== 'public'}
                allowPublicRegistration={publicRegistrationAccess !== 'members'}
              />
            </div>
          )}

          {activeWizardStep === 2 && (
            <div ref={stepTwoRef} className="space-y-4 scroll-mt-24">
              <ProfileStepCard
                matchedMember={memberLookup.matchedMember}
                isUpdateMode={memberLookup.isUpdateMode}
                isRegistrationBlocked={isEffectiveRegistrationBlocked}
                shouldFadeDetails={false}
                countdownMs={TIMING.registrationWizardConfirmTimeoutMs}
                onTimeout={resetToStepOne}
                onContinueToStepThree={
                  isEffectiveRegistrationBlocked ? undefined : enterWizardCompleteStep
                }
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  className="w-full"
                  onClick={resetToStepOne}
                  size="lg"
                  type="button"
                  variant="accent"
                >
                  Scan Another Member
                </Button>
              </div>
            </div>
          )}

          {activeWizardStep === 3 && (
            <div ref={dynamicFieldsStepRef} className="space-y-4 scroll-mt-24">
              {shouldBypassDynamicFieldsStepCard ? (
                <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
                  <p className="text-lg font-semibold text-text">Submitting registration...</p>
                  <p className="mt-1 text-sm text-muted">
                    No additional questions are required for this event.
                  </p>
                </div>
              ) : (
                <DynamicFieldsStepCard
                  matchedMember={memberLookup.matchedMember}
                  isLocked={memberLookup.isRegistrationBlocked}
                  shouldFadeLockedState={memberLookup.isRegistrationBlocked && lookupErrorFadeOut}
                  lockedMessage={memberLookup.lockedStepMessage}
                  onCancelUpdate={handleCancelUpdate}
                  isLoadingFields={eventFieldsQuery.isLoading}
                  isFieldsError={eventFieldsQuery.isError}
                  fieldConfigIssues={eventFieldsQuery.data?.issues ?? []}
                  activeFields={activeFields}
                  remainingSlotsByFieldOption={remainingSlotsByFieldOption}
                  remainingSlotsByRoleByFieldOption={remainingSlotsByRoleByFieldOption}
                  dynamicForm={dynamicForm}
                  onSubmit={handleSubmitRegistration}
                  fieldErrorMessage={fieldErrorMessage}
                  isSubmitPending={submitMutation.isPending}
                  submitButtonLabel={memberLookup.isUpdateMode ? 'Update' : 'Submit Registration'}
                  submitErrorMessage={submitErrorMessage}
                  submitSuccessMessage={submitSuccessMessage}
                  isRegistrationConfirmed={isRegistrationConfirmed}
                  onConfirmAcknowledged={resetToStepOne}
                  countdownMs={TIMING.registrationWizardConfirmedResetMs}
                  onCountdownTimeout={resetToStepOne}
                  inactivityTimeoutMs={TIMING.kioskInactivityResetMs}
                  onInactivityTimeout={resetToStepOne}
                />
              )}

              {!isRegistrationConfirmed && (
                <Button
                  className="hover:bg-surface"
                  onClick={enterWizardConfirmStep}
                  size="lg"
                  type="button"
                  variant="outline"
                >
                  Back to Step 2
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
