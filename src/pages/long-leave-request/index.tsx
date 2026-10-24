import { useRef } from 'react';

import { StepIndicator } from '@/components/ui';
import { useWizardStepScroll } from '@/hooks/utils';

import {
  LongLeaveConfirmationStepCard,
  LongLeaveDetailsStepCard,
  LongLeaveHeaderCard,
  LongLeaveLookupStepCard,
  LongLeaveProfileConfirmStepCard,
} from './components';
import { useLongLeaveRequestPageState } from './hooks/useLongLeaveRequestPageState';

export function LongLeaveRequestPage() {
  const stepOneRef = useRef<HTMLDivElement | null>(null);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);
  const stepThreeRef = useRef<HTMLDivElement | null>(null);

  const {
    activeWizardStep,
    isVerifyingSignedInMember,
    lookupForm,
    handleLookupSubmit,
    isLookupPending,
    lookupErrorMessage,
    clearLookupError,
    isRegistrationBlocked,
    memberIdHighlight,
    handleBackToStepOne,
    matchedMember,
    isSignedIn,
    handleConfirmProfile,
    longLeaveForm,
    onSubmitLongLeave,
    isSubmitting,
    submitErrorMessage,
    goHome,
    isSubmissionConfirmed,
    submissionResult,
    volunteerName,
    volunteerMemberId,
    handleResetForm,
  } = useLongLeaveRequestPageState();

  useWizardStepScroll(activeWizardStep, [stepOneRef, stepTwoRef, stepThreeRef]);

  if (isSubmissionConfirmed && submissionResult) {
    return (
      <LongLeaveConfirmationStepCard
        submissionResult={submissionResult}
        volunteerName={volunteerName}
        volunteerMemberId={volunteerMemberId}
        onSubmitAnother={handleResetForm}
        onGoHome={goHome}
      />
    );
  }

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <LongLeaveHeaderCard defaultExpanded={false} />

      <div className="space-y-6">
        <StepIndicator
          currentStep={activeWizardStep}
          totalSteps={3}
          labels={['Identify', 'Confirm', 'Long Leave Details']}
          categoryLabel="Long leave request steps"
        />

        {/* Step 1: Scan / Member Lookup */}
        {activeWizardStep === 1 && (
          <div ref={stepOneRef} className="space-y-4 scroll-mt-24">
            <LongLeaveLookupStepCard
              isVerifyingSignedInMember={isVerifyingSignedInMember}
              lookupForm={lookupForm}
              onLookupSubmit={handleLookupSubmit}
              isLookupPending={isLookupPending}
              lookupErrorMessage={lookupErrorMessage}
              onDismissLookupError={clearLookupError}
              isRegistrationBlocked={isRegistrationBlocked}
              memberIdHighlight={memberIdHighlight}
            />
          </div>
        )}

        {/* Step 2: Confirm Profile Details */}
        {activeWizardStep === 2 && (
          <div ref={stepTwoRef} className="space-y-4 scroll-mt-24">
            <LongLeaveProfileConfirmStepCard
              matchedMember={matchedMember}
              isRegistrationBlocked={isRegistrationBlocked}
              isSignedIn={isSignedIn}
              onConfirm={handleConfirmProfile}
              onBackOrScanAnother={isSignedIn ? goHome : handleBackToStepOne}
            />
          </div>
        )}

        {/* Step 3: Long Leave Details Form */}
        {activeWizardStep === 3 && (
          <div ref={stepThreeRef} className="space-y-4 scroll-mt-24">
            <LongLeaveDetailsStepCard
              longLeaveForm={longLeaveForm}
              onSubmit={onSubmitLongLeave}
              onCancel={goHome}
              isSubmitting={isSubmitting}
              submitErrorMessage={submitErrorMessage}
            />
          </div>
        )}
      </div>
    </section>
  );
}
