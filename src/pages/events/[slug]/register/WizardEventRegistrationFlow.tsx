import { Button } from '@/components/ui/Button'
import {
  DynamicFieldsStepCard,
  EventHeaderCard,
  LockedGateCard,
  MemberLookupStepCard,
  ProfileStepCard,
} from '@/pages/events/[slug]/register/components'
import { stepBadgeClassName, useEventRegistrationPageState } from './useEventRegistrationPageState'
import './wizardRegistrationFlow.css'

export function WizardEventRegistrationFlow() {
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
    wizardStepSecondsRemaining,
    enterWizardCompleteStep,
    resetToStepOne,
    dynamicFieldsStepRef,
    eventFieldsQuery,
    activeFields,
    dynamicForm,
    handleSubmitRegistration,
    fieldErrorMessage,
    submitMutation,
    submitErrorMessage,
    submitSuccessMessage,
    handleCancelUpdate,
    enterWizardConfirmStep,
    isEffectiveRegistrationBlocked,
  } = useEventRegistrationPageState('wizard')

  return (
    <section className="wizard-registration-flow mx-auto max-w-3xl space-y-6">
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
          <div className="rounded-xl border border-border bg-surface px-5 py-4 shadow-xs">
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">
              Registration steps
            </p>
            <div className="mt-3 flex items-center gap-3 text-base">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold ${stepBadgeClassName(activeWizardStep, 1)}`}
                >
                  1
                </span>
                <span className="text-text">Scan</span>
              </div>
              <div className="h-px flex-1 bg-border" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold ${stepBadgeClassName(activeWizardStep, 2)}`}
                >
                  2
                </span>
                <span className="text-text">Confirm</span>
              </div>
              <div className="h-px flex-1 bg-border" aria-hidden="true" />
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-base font-semibold ${stepBadgeClassName(activeWizardStep, 3)}`}
                >
                  3
                </span>
                <span className="text-text">Complete</span>
              </div>
            </div>
          </div>

          {activeWizardStep === 1 && (
            <MemberLookupStepCard
              lookupForm={memberLookup.lookupForm}
              onLookupSubmit={handleLookupSubmit}
              isLookupPending={memberLookup.isLookupPending}
              lookupErrorMessage={lookupErrorMessage}
              shouldFadeLookupError={lookupErrorFadeOut}
              suppressLookupWarning={memberLookup.isRegistrationBlocked}
              memberIdInputRef={memberIdInputRef}
              shouldHighlightInput={memberLookup.memberIdHighlight}
              onDismissLookupError={clearLookupError}
            />
          )}

          {activeWizardStep === 2 && (
            <div className="space-y-4">
              <ProfileStepCard
                matchedMember={memberLookup.matchedMember}
                isUpdateMode={memberLookup.isUpdateMode}
                isRegistrationBlocked={isEffectiveRegistrationBlocked}
                shouldFadeDetails={false}
                stepTimeoutSecondsRemaining={wizardStepSecondsRemaining}
                onContinueToStepThree={
                  isEffectiveRegistrationBlocked ? undefined : enterWizardCompleteStep
                }
              />

              <div className="flex flex-wrap gap-2">
                <Button onClick={resetToStepOne} size="md" type="button" variant="outline">
                  Scan Another Member
                </Button>
              </div>
            </div>
          )}

          {activeWizardStep === 3 && (
            <div ref={dynamicFieldsStepRef} className="space-y-4">
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
                dynamicForm={dynamicForm}
                onSubmit={handleSubmitRegistration}
                fieldErrorMessage={fieldErrorMessage}
                isSubmitPending={submitMutation.isPending}
                submitButtonLabel={memberLookup.isUpdateMode ? 'Update' : 'Submit Registration'}
                submitErrorMessage={submitErrorMessage}
                submitSuccessMessage={submitSuccessMessage}
                stepTimeoutSecondsRemaining={wizardStepSecondsRemaining}
              />

              <Button
                className="hover:bg-surface"
                onClick={enterWizardConfirmStep}
                size="md"
                type="button"
                variant="outline"
              >
                Back to Step 2
              </Button>
            </div>
          )}
        </div>
      ) : (
        <LockedGateCard />
      )}
    </section>
  )
}
