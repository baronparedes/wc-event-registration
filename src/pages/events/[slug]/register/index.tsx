import { useRef } from 'react';

import { Button } from '@/components/ui/Button';
import { EventHeaderCard } from '@/components/ui/EventHeaderCard';
import { SectionCard } from '@/components/ui/SectionCard';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { TIMING } from '@/config/constants';
import { useWizardStepScroll } from '@/hooks/utils';

import { DynamicFieldsStepCard, MemberLookupStepCard, ProfileStepCard } from './components';
import { useEventRegistrationPageState } from './hooks';

export function EventRegistrationPage() {
  const stepOneRef = useRef<HTMLDivElement | null>(null);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);

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
  } = useEventRegistrationPageState();

  useWizardStepScroll(activeWizardStep, [stepOneRef, stepTwoRef, dynamicFieldsStepRef]);

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
                allowPublicRegistration={
                  availability?.status === 'available' && availability.event
                    ? Boolean(availability.event.allow_public_registrations)
                    : false
                }
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
                <Button onClick={resetToStepOne} size="lg" type="button" variant="outline">
                  Scan Another Member
                </Button>
              </div>
            </div>
          )}

          {activeWizardStep === 3 && (
            <div ref={dynamicFieldsStepRef} className="space-y-4 scroll-mt-24">
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
