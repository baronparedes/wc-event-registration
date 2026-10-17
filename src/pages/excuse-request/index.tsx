import { useRef } from 'react';

import { StepIndicator } from '@/components/ui';
import { useWizardStepScroll } from '@/hooks/utils';

import {
  ExcuseConfirmationStepCard,
  ExcuseDetailsStepCard,
  ExcuseHeaderCard,
  ExcuseLookupStepCard,
  ExcuseProfileConfirmStepCard,
} from './components';
import { useExcuseRequestPageState } from './hooks/useExcuseRequestPageState';

export function ExcuseRequestPage() {
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
    excuseForm,
    selectedServices,
    handleToggleService,
    onSubmitExcuse,
    isSubmitting,
    submitErrorMessage,
    goHome,
    isSubmissionConfirmed,
    submissionResult,
    volunteerName,
    volunteerMemberId,
    handleResetForm,
  } = useExcuseRequestPageState();

  useWizardStepScroll(activeWizardStep, [stepOneRef, stepTwoRef, stepThreeRef]);

  if (isSubmissionConfirmed && submissionResult) {
    return (
      <ExcuseConfirmationStepCard
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
      <ExcuseHeaderCard defaultExpanded={false} />

      <div className="space-y-6">
        <StepIndicator
          currentStep={activeWizardStep}
          totalSteps={3}
          labels={['Identify', 'Confirm', 'Excuse Details']}
          categoryLabel="Excuse request steps"
        />

        {/* Step 1: Scan / Member Lookup */}
        {activeWizardStep === 1 && (
          <div ref={stepOneRef} className="space-y-4 scroll-mt-24">
            <ExcuseLookupStepCard
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
            <ExcuseProfileConfirmStepCard
              matchedMember={matchedMember}
              isRegistrationBlocked={isRegistrationBlocked}
              isSignedIn={isSignedIn}
              onConfirm={handleConfirmProfile}
              onBackOrScanAnother={isSignedIn ? goHome : handleBackToStepOne}
            />
          </div>
        )}

        {/* Step 3: Excuse Details Form */}
        {activeWizardStep === 3 && (
          <div ref={stepThreeRef} className="space-y-4 scroll-mt-24">
            <ExcuseDetailsStepCard
              excuseForm={excuseForm}
              selectedServices={selectedServices}
              onToggleService={handleToggleService}
              onSubmit={onSubmitExcuse}
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
