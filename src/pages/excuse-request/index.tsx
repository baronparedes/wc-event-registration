import { useCallback, useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import {
  AlertBanner,
  Button,
  LoadingState,
  SectionCard,
  StepIndicator,
  WizardStep,
} from '@/components/ui';
import { FORM_MESSAGES, ROUTE_PATHS } from '@/config/constants';
import { useCurrentProfileQuery, useMemberLookupState } from '@/hooks/domain/members';
import { useSubmitExcuseMutation } from '@/hooks/domain/services';
import { useErrorWithFadeout, useWizardStepScroll } from '@/hooks/utils';
import { type SubmitServiceExcuseInput } from '@/lib/domain/services';
import { MemberLookupStepCard, ProfileStepCard } from '@/pages/events/[slug]/register/components';

import { ExcuseHeaderCard } from './components/ExcuseHeaderCard';
import { SundayCalendarPicker } from './components/SundayCalendarPicker';
import {
  EXCUSE_SERVICE_SLOTS,
  formatServiceSlots,
  getNearestUpcomingSundayString,
  parseDateOnly,
} from './utils';

const excuseFormSchema = z.object({
  request_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Request date must be in YYYY-MM-DD format')
    .refine((val) => {
      const parsed = parseDateOnly(val);
      if (!parsed) return false;
      return parsed.getDay() === 0;
    }, 'Selected date must be a Sunday')
    .refine((val) => {
      const parsed = parseDateOnly(val);
      if (!parsed) return false;
      const oldest = new Date();
      oldest.setHours(0, 0, 0, 0);
      oldest.setDate(oldest.getDate() - 3);
      return parsed >= oldest;
    }, 'Selected Sunday cannot be more than 3 days in the past')
    .refine((val) => {
      const parsed = parseDateOnly(val);
      if (!parsed) return false;
      const maxFuture = new Date();
      maxFuture.setHours(23, 59, 59, 999);
      maxFuture.setMonth(maxFuture.getMonth() + 6);
      return parsed <= maxFuture;
    }, 'Selected Sunday cannot be more than 6 months in the future'),
  services: z.array(z.string().trim().min(1)).min(1, 'Please select at least one service slot'),
  reason: z.string().trim().max(500, 'Reason must be 500 characters or less').optional().nullable(),
});

type ExcuseFormValues = z.infer<typeof excuseFormSchema>;

export function ExcuseRequestPage() {
  const navigate = useNavigate();
  const stepOneRef = useRef<HTMLDivElement | null>(null);
  const stepTwoRef = useRef<HTMLDivElement | null>(null);
  const stepThreeRef = useRef<HTMLDivElement | null>(null);

  const [activeWizardStep, setActiveWizardStep] = useState<1 | 2 | 3>(1);

  const {
    error: lookupErrorMessage,
    showError: showLookupError,
    clearError: clearLookupError,
  } = useErrorWithFadeout();

  const memberIdInputRef = useRef<HTMLInputElement | null>(null);
  const isMountedRef = useRef(true);
  const autoLookupAttemptedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Profile auto-detection for signed-in members
  const { data: currentProfile, isLoading: isProfileLoading } = useCurrentProfileQuery();
  const isSignedIn = Boolean(currentProfile?.member_id);
  const [autoLookupStatus, setAutoLookupStatus] = useState<'idle' | 'executing' | 'completed'>(
    'idle',
  );
  const isVerifyingSignedInMember = isSignedIn && autoLookupStatus === 'executing';

  const memberLookup = useMemberLookupState(undefined);
  const {
    matchedMember,
    isRegistrationBlocked,
    memberIdHighlight,
    reset: resetMemberLookup,
    lookupForm,
    isLookupPending,
    handleLookupSubmit: runMemberLookupSubmit,
  } = memberLookup;

  // Excuse Form (Step 3)
  const excuseForm = useForm<ExcuseFormValues>({
    resolver: zodResolver(excuseFormSchema),
    defaultValues: {
      request_date: getNearestUpcomingSundayString(),
      services: ['9AM'],
      reason: '',
    },
  });

  const selectedServices = useWatch({
    control: excuseForm.control,
    name: 'services',
    defaultValue: ['9AM'],
  });

  // Submission mutation & state
  const submitMutation = useSubmitExcuseMutation();
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [isSubmissionConfirmed, setIsSubmissionConfirmed] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    request_date: string;
    services: string[];
    reason: string | null;
  } | null>(null);

  useWizardStepScroll(activeWizardStep, [stepOneRef, stepTwoRef, stepThreeRef]);

  // Handle member lookup submit
  const handleLookupSubmit = useCallback(
    async (values: Parameters<typeof runMemberLookupSubmit>[0]) => {
      setSubmitErrorMessage(null);
      setIsSubmissionConfirmed(false);
      clearLookupError();

      const result = await runMemberLookupSubmit(values);

      if (!result.success) {
        showLookupError(result.error || FORM_MESSAGES.memberLookupFailed);
        return;
      }

      setActiveWizardStep(2);
    },
    [clearLookupError, runMemberLookupSubmit, showLookupError],
  );

  // Auto-verify signed-in member
  useEffect(() => {
    if (
      isProfileLoading ||
      !currentProfile?.member_id ||
      matchedMember ||
      autoLookupAttemptedRef.current
    ) {
      return;
    }

    autoLookupAttemptedRef.current = true;
    setAutoLookupStatus('executing');

    void Promise.resolve().then(async () => {
      const result = await runMemberLookupSubmit({ memberId: currentProfile.member_id });
      if (!isMountedRef.current) return;

      setAutoLookupStatus('completed');
      if (result.success) {
        setActiveWizardStep(2);
      } else {
        showLookupError(result.error || FORM_MESSAGES.memberLookupFailed);
        setActiveWizardStep(1);
      }
    });
  }, [
    isProfileLoading,
    currentProfile?.member_id,
    matchedMember,
    runMemberLookupSubmit,
    showLookupError,
  ]);

  const handleToggleService = (serviceValue: string) => {
    const current = selectedServices ?? [];
    if (current.includes(serviceValue)) {
      if (current.length === 1) {
        toast.error('At least one service slot must be selected');
        return;
      }
      excuseForm.setValue(
        'services',
        current.filter((s) => s !== serviceValue),
        { shouldValidate: true },
      );
    } else {
      excuseForm.setValue('services', [...current, serviceValue], { shouldValidate: true });
    }
  };

  const onSubmitExcuse = async (data: ExcuseFormValues) => {
    setSubmitErrorMessage(null);
    try {
      const payload: SubmitServiceExcuseInput = {
        request_date: data.request_date,
        services: data.services,
        reason: data.reason?.trim() ? data.reason.trim() : null,
      };

      if (isSignedIn && currentProfile) {
        payload.user_id = currentProfile.id;
        payload.member_id = currentProfile.member_id;
      } else if (matchedMember?.member_token) {
        payload.member_token = matchedMember.member_token;
      } else if (matchedMember?.user_id) {
        payload.user_id = matchedMember.user_id;
      }

      await submitMutation.mutateAsync(payload);
      setSubmissionResult({
        request_date: data.request_date,
        services: data.services,
        reason: data.reason?.trim() ? data.reason.trim() : null,
      });
      setIsSubmissionConfirmed(true);
      toast.success('Excuse request submitted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit excuse request';
      setSubmitErrorMessage(message);
      toast.error(message);
    }
  };

  const handleBackToStepOne = () => {
    resetMemberLookup();
    clearLookupError();
    setActiveWizardStep(1);
  };

  const handleResetForm = () => {
    resetMemberLookup();
    excuseForm.reset();
    clearLookupError();
    setSubmitErrorMessage(null);
    setIsSubmissionConfirmed(false);
    setSubmissionResult(null);
    autoLookupAttemptedRef.current = false;
    setActiveWizardStep(1);
  };

  const goHome = () => {
    navigate(ROUTE_PATHS.home);
  };

  // Volunteer name and id helper
  const volunteerName = matchedMember
    ? `${matchedMember.first_name ?? ''} ${matchedMember.last_initial ?? ''}`.trim() ||
      matchedMember.full_name ||
      'Verified Volunteer'
    : 'Volunteer';
  const volunteerMemberId = currentProfile?.member_id ?? '';

  if (isSubmissionConfirmed && submissionResult) {
    return (
      <section className="mx-auto max-w-5xl space-y-6">
        <ExcuseHeaderCard defaultExpanded={false} />

        <WizardStep title="Submission Complete">
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <CheckCircle2 className="h-16 w-16 text-primary" aria-hidden="true" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-text">Excuse Request Submitted!</h2>
              <p className="text-muted">
                Thank you for letting your team leaders and coordinators know in advance.
              </p>
            </div>

            <div
              aria-live="polite"
              className="flex items-start gap-3 rounded-lg border-2 border-green-600 bg-green-100 px-4 py-3 text-green-950 shadow-md text-left"
            >
              <span
                aria-hidden="true"
                className="mt-0.5 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white ring-1 ring-green-800/30"
              >
                ✓
              </span>
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-green-950">
                  {volunteerName} {volunteerMemberId ? `(${volunteerMemberId})` : ''}
                </p>
                <p className="text-green-900">
                  Sunday Date:{' '}
                  <span className="font-medium">
                    {new Date(`${submissionResult.request_date}T00:00:00`).toLocaleDateString(
                      'en-US',
                      {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      },
                    )}
                  </span>
                </p>
                <p className="text-green-900">
                  Excused Services:{' '}
                  <span className="font-medium">
                    {formatServiceSlots(submissionResult.services)}
                  </span>
                </p>
                {submissionResult.reason && (
                  <p className="text-green-900 italic">"{submissionResult.reason}"</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="w-full" onClick={handleResetForm} size="lg" variant="default">
                Submit Another Request
              </Button>
              <Button className="w-full" onClick={goHome} size="lg" variant="primaryOutline">
                Go Home
              </Button>
            </div>
          </div>
        </WizardStep>
      </section>
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
            {isVerifyingSignedInMember ? (
              <SectionCard title="Verifying Profile">
                <LoadingState
                  layout="horizontal"
                  message="Checking your member profile..."
                  className="py-4"
                />
              </SectionCard>
            ) : (
              <MemberLookupStepCard
                lookupForm={lookupForm}
                onLookupSubmit={handleLookupSubmit}
                isLookupPending={isLookupPending}
                lookupErrorMessage={lookupErrorMessage}
                suppressLookupWarning={isRegistrationBlocked}
                memberIdInputRef={memberIdInputRef}
                shouldHighlightInput={memberIdHighlight}
                onDismissLookupError={clearLookupError}
                allowNameLookup={true}
                allowMemberRegistration={true}
                allowPublicRegistration={false}
              />
            )}
          </div>
        )}

        {/* Step 2: Confirm Member Details */}
        {activeWizardStep === 2 && (
          <div ref={stepTwoRef} className="space-y-4 scroll-mt-24">
            <ProfileStepCard
              matchedMember={matchedMember}
              isUpdateMode={false}
              isRegistrationBlocked={isRegistrationBlocked}
              shouldFadeDetails={false}
              onContinueToStepThree={() => setActiveWizardStep(3)}
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

        {/* Step 3: Excuse Details Form */}
        {activeWizardStep === 3 && (
          <div ref={stepThreeRef} className="space-y-4 scroll-mt-24">
            <WizardStep
              title="Step 3: Excuse Details"
              subtitle="Select the Sunday date and specific service slot(s) you need to be excused from."
            >
              <form onSubmit={excuseForm.handleSubmit(onSubmitExcuse)} className="space-y-6">
                {submitErrorMessage && (
                  <AlertBanner variant="error" description={submitErrorMessage} />
                )}

                <div className="space-y-5">
                  {/* Sunday Service Date */}
                  <div className="space-y-1.5">
                    <label
                      className="block text-sm font-medium text-text"
                      htmlFor="field-request-date"
                    >
                      Sunday Service Date <span className="text-danger"> *</span>
                    </label>
                    <p className="text-xs text-muted">
                      Select the upcoming Sunday you will be absent.
                    </p>
                    <Controller
                      control={excuseForm.control}
                      name="request_date"
                      render={({ field }) => (
                        <SundayCalendarPicker
                          id="field-request-date"
                          value={field.value}
                          onChange={(val) => field.onChange(val)}
                          maxPastDays={3}
                          monthsInFuture={6}
                          allowedWeekdays={[0]}
                        />
                      )}
                    />
                    {excuseForm.formState.errors.request_date && (
                      <p className="text-sm text-danger">
                        {excuseForm.formState.errors.request_date.message}
                      </p>
                    )}
                  </div>

                  {/* Service Slots Multi-Select Checkboxes */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-text">
                        Service Slots <span className="text-danger"> *</span>
                      </label>
                      <span className="text-xs text-muted">Select all that apply</span>
                    </div>
                    <p className="text-xs text-muted">
                      Select all service times you are excusing yourself from.
                    </p>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 pt-1">
                      {EXCUSE_SERVICE_SLOTS.map((slot) => {
                        const isChecked = selectedServices.includes(slot.value);
                        return (
                          <button
                            key={slot.value}
                            type="button"
                            role="checkbox"
                            aria-checked={isChecked}
                            onClick={() => handleToggleService(slot.value)}
                            className={`flex items-center justify-between rounded-xl border p-3.5 text-left transition ${
                              isChecked
                                ? 'border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary'
                                : 'border-border bg-background text-text hover:border-muted'
                            }`}
                          >
                            <span className="text-sm">{slot.label}</span>
                            <div
                              className={`h-5 w-5 rounded-md border flex items-center justify-center transition ${
                                isChecked
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-border bg-surface'
                              }`}
                            >
                              {isChecked && <CheckCircle2 className="h-3.5 w-3.5" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {excuseForm.formState.errors.services && (
                      <p className="text-sm text-danger">
                        {excuseForm.formState.errors.services.message}
                      </p>
                    )}
                  </div>

                  {/* Reason / Notes */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-text" htmlFor="field-reason">
                      Reason / Notes{' '}
                      <span className="text-xs text-muted font-normal">(Optional)</span>
                    </label>
                    <p className="text-xs text-muted">
                      Add any context for your coordinators or team leaders.
                    </p>
                    <textarea
                      id="field-reason"
                      rows={3}
                      placeholder="e.g., Out of town, family event, medical reason..."
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      {...excuseForm.register('reason')}
                    />
                    {excuseForm.formState.errors.reason && (
                      <p className="text-sm text-danger">
                        {excuseForm.formState.errors.reason.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-3 sm:flex-row">
                  <Button
                    className="w-full"
                    disabled={submitMutation.isPending}
                    size="lg"
                    type="submit"
                    variant="default"
                  >
                    {submitMutation.isPending ? 'Submitting...' : 'Submit Excuse Request'}
                  </Button>

                  <Button
                    className="w-full sm:w-auto"
                    disabled={submitMutation.isPending}
                    onClick={() => setActiveWizardStep(2)}
                    size="lg"
                    type="button"
                    variant="primaryOutline"
                  >
                    Back
                  </Button>
                </div>
              </form>
            </WizardStep>
          </div>
        )}
      </div>
    </section>
  );
}
