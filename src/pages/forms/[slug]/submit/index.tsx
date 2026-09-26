import { useRef } from 'react';

import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button, EmptyState, SectionCard, StepIndicator } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';
import { useWizardStepScroll } from '@/hooks/utils';
import { MemberLookupStepCard, ProfileStepCard } from '@/pages/events/[slug]/register/components';

import {
  FormConfirmationStepCard,
  FormFieldsStepCard,
  FormHeaderCard,
  GuestInfoStepCard,
} from './components';
import { useFormSubmissionPageState } from './hooks/useFormSubmissionPageState';

export function FormSubmissionPage() {
  const navigate = useNavigate();
  const stepOneRef = useRef<HTMLDivElement | null>(null);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);
  const stepThreeRef = useRef<HTMLDivElement | null>(null);

  const {
    formQuery,
    form,
    isPublished,
    audience,
    respondentType,
    activeWizardStep,
    fields,
    fieldsLoading,
    fieldsError,
    dynamicForm,
    // Member lookup
    memberLookup,
    memberIdInputRef,
    lookupErrorMessage,
    handleLookupSubmit,
    clearLookupError,
    isSignedIn,
    isVerifyingSignedInMember,
    // Guest info
    guestInfo,
    handleGuestInfoSubmit,
    // Mode toggles & navigation
    switchToGuestMode,
    switchToMemberMode,
    continueToQuestions,
    handleBackToStepOne,
    handleBackToStepTwo,
    // Submission
    handleSubmitForm,
    isSubmitting,
    submitErrorMessage,
    isSubmissionConfirmed,
    submissionResult,
    resetForm,
    goHome,
  } = useFormSubmissionPageState();

  useWizardStepScroll(activeWizardStep, [stepOneRef, stepTwoRef, stepThreeRef]);

  if (formQuery.isLoading) {
    return (
      <section className="mx-auto max-w-5xl space-y-6">
        <SectionCard title="Loading Form...">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-3/4 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
          </div>
        </SectionCard>
      </section>
    );
  }

  if (formQuery.isError || !form || !isPublished) {
    return (
      <section className="mx-auto max-w-5xl space-y-6">
        <EmptyState
          icon={<AlertCircle className="h-6 w-6" />}
          title="Form Unavailable"
          description="This form is not currently active or available."
          action={
            <div className="flex gap-3 pt-2">
              <Button onClick={() => navigate(ROUTE_PATHS.home)} variant="default">
                Go Home
              </Button>
              <Button onClick={() => navigate(-1)} variant="primaryOutline">
                Go Back
              </Button>
            </div>
          }
        />
      </section>
    );
  }

  if (isSubmissionConfirmed && submissionResult) {
    return (
      <section className="mx-auto max-w-5xl space-y-6">
        <FormHeaderCard
          form={form}
          isLoading={formQuery.isLoading}
          isError={formQuery.isError}
          defaultExpanded={false}
        />
        <FormConfirmationStepCard
          submissionId={submissionResult.submission_id}
          status={submissionResult.status}
          onReset={resetForm}
          onGoHome={goHome}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <FormHeaderCard
        form={form}
        isLoading={formQuery.isLoading}
        isError={formQuery.isError}
        defaultExpanded={false}
      />

      <div className="space-y-6">
        {respondentType === 'member' ? (
          <StepIndicator
            currentStep={activeWizardStep}
            totalSteps={3}
            labels={['Identify', 'Confirm', 'Questions']}
            categoryLabel="Form steps"
          />
        ) : (
          <StepIndicator
            currentStep={activeWizardStep}
            totalSteps={2}
            labels={['Your Info', 'Questions']}
            categoryLabel="Form steps"
          />
        )}

        {/* Member Flow */}
        {respondentType === 'member' && (
          <>
            {activeWizardStep === 1 && (
              <div ref={stepOneRef} className="space-y-4 scroll-mt-24">
                {isVerifyingSignedInMember ? (
                  <SectionCard title="Verifying Profile">
                    <div className="flex items-center space-x-3 py-4">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                      <p className="text-sm text-muted">Checking your member profile...</p>
                    </div>
                  </SectionCard>
                ) : (
                  <MemberLookupStepCard
                    lookupForm={memberLookup.lookupForm}
                    onLookupSubmit={handleLookupSubmit}
                    isLookupPending={memberLookup.isLookupPending}
                    lookupErrorMessage={lookupErrorMessage}
                    suppressLookupWarning={memberLookup.isRegistrationBlocked}
                    memberIdInputRef={memberIdInputRef}
                    shouldHighlightInput={memberLookup.memberIdHighlight}
                    onDismissLookupError={clearLookupError}
                    allowNameLookup={true}
                    allowMemberRegistration={audience !== 'public'}
                    allowPublicRegistration={audience === 'members_and_public'}
                    onGuestClick={switchToGuestMode}
                    guestButtonLabel="Fill out as Guest"
                  />
                )}
              </div>
            )}

            {activeWizardStep === 2 && (
              <div ref={stepTwoRef} className="space-y-4 scroll-mt-24">
                <ProfileStepCard
                  matchedMember={memberLookup.matchedMember}
                  isUpdateMode={memberLookup.isUpdateMode}
                  isRegistrationBlocked={memberLookup.isRegistrationBlocked}
                  shouldFadeDetails={false}
                  onContinueToStepThree={
                    memberLookup.isRegistrationBlocked ? undefined : continueToQuestions
                  }
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    className="w-full"
                    onClick={isSignedIn ? goHome : handleBackToStepOne}
                    size="lg"
                    type="button"
                    variant="accent"
                  >
                    {isSignedIn ? 'Back to Home' : 'Scan Another Member'}
                  </Button>
                </div>
              </div>
            )}

            {activeWizardStep === 3 && (
              <div ref={stepThreeRef} className="space-y-4 scroll-mt-24">
                {fieldsLoading ? (
                  <SectionCard title="Loading Questions...">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 w-full rounded bg-muted" />
                      <div className="h-4 w-5/6 rounded bg-muted" />
                    </div>
                  </SectionCard>
                ) : fieldsError ? (
                  <SectionCard title="Error">
                    <p className="text-sm text-destructive">Failed to load form questions.</p>
                  </SectionCard>
                ) : (
                  <FormFieldsStepCard
                    fields={fields}
                    dynamicForm={dynamicForm}
                    onSubmit={handleSubmitForm}
                    isSubmitting={isSubmitting}
                    submitErrorMessage={submitErrorMessage}
                    submitButtonLabel={
                      memberLookup.isUpdateMode ? 'Update Submission' : 'Submit Form'
                    }
                    onBack={isSignedIn ? undefined : handleBackToStepTwo}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* Guest Flow */}
        {respondentType === 'guest' && (
          <>
            {activeWizardStep === 1 && (
              <div ref={stepOneRef} className="space-y-4 scroll-mt-24">
                <GuestInfoStepCard
                  onSubmit={handleGuestInfoSubmit}
                  defaultValues={guestInfo ?? undefined}
                  allowSwitchToMember={audience === 'members_and_public'}
                  onSwitchToMember={switchToMemberMode}
                />
              </div>
            )}

            {activeWizardStep === 2 && (
              <div ref={stepTwoRef} className="space-y-4 scroll-mt-24">
                {fieldsLoading ? (
                  <SectionCard title="Loading Questions...">
                    <div className="animate-pulse space-y-3">
                      <div className="h-4 w-full rounded bg-muted" />
                      <div className="h-4 w-5/6 rounded bg-muted" />
                    </div>
                  </SectionCard>
                ) : fieldsError ? (
                  <SectionCard title="Error">
                    <p className="text-sm text-destructive">Failed to load form questions.</p>
                  </SectionCard>
                ) : (
                  <FormFieldsStepCard
                    fields={fields}
                    dynamicForm={dynamicForm}
                    onSubmit={handleSubmitForm}
                    isSubmitting={isSubmitting}
                    submitErrorMessage={submitErrorMessage}
                    submitButtonLabel="Submit Form"
                    onBack={handleBackToStepOne}
                  />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
