import { useCallback, useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { FORM_MESSAGES, ROUTE_PATHS } from '@/config/constants';
import { useCurrentProfileQuery, useMemberLookupState } from '@/hooks/domain/members';
import { useSubmitExcuseMutation } from '@/hooks/domain/services';
import { useErrorWithFadeout } from '@/hooks/utils';
import { MATRIX_TIME_SLOTS, type SubmitServiceExcuseInput } from '@/lib/domain/services';

function isSundayDateString(val?: string): boolean {
  if (!val) return true;
  const [y, m, d] = val.split('-').map(Number);
  if (!y || !m || !d) return false;
  const date = new Date(y, m - 1, d);
  return date.getDay() === 0;
}

export const longLeaveFormSchema = z
  .object({
    start_date: z
      .string()
      .trim()
      .min(1, 'Please select a start date')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date in YYYY-MM-DD format')
      .refine(isSundayDateString, 'Start date must be a Sunday'),
    end_date: z
      .string()
      .trim()
      .min(1, 'Please select an end date')
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid date in YYYY-MM-DD format')
      .refine(isSundayDateString, 'End date must be a Sunday'),
    reason: z
      .string()
      .trim()
      .min(1, 'Please provide a reason for the leave')
      .max(500, 'Reason must be 500 characters or less'),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      const [sy, sm, sd] = data.start_date.split('-').map(Number);
      const [ey, em, ed] = data.end_date.split('-').map(Number);
      if (!sy || !sm || !sd || !ey || !em || !ed) return true;
      const start = new Date(sy, sm - 1, sd);
      const end = new Date(ey, em - 1, ed);
      const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 28;
    },
    {
      message: 'Long leave must span at least 4 weeks (28 days) from start date',
      path: ['end_date'],
    },
  );

export type LongLeaveFormValues = z.infer<typeof longLeaveFormSchema>;

export function useLongLeaveRequestPageState() {
  const navigate = useNavigate();

  const [activeWizardStep, setActiveWizardStep] = useState<1 | 2 | 3>(1);

  const {
    error: lookupErrorMessage,
    showError: showLookupError,
    clearError: clearLookupError,
  } = useErrorWithFadeout();

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

  // Excuse Form (Step 3) - start with nothing selected
  const longLeaveForm = useForm<LongLeaveFormValues>({
    resolver: zodResolver(longLeaveFormSchema),
    defaultValues: {
      start_date: '',
      end_date: '',
      reason: '',
    },
  });

  // Submission mutation & state
  const submitMutation = useSubmitExcuseMutation();
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [isSubmissionConfirmed, setIsSubmissionConfirmed] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    start_date: string;
    end_date: string;
    reason: string;
  } | null>(null);

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

  const onSubmitLongLeave = async (data: LongLeaveFormValues) => {
    setSubmitErrorMessage(null);
    try {
      const payload: SubmitServiceExcuseInput = {
        start_date: data.start_date,
        end_date: data.end_date,
        is_long_leave: true,
        services: [...MATRIX_TIME_SLOTS],
        reason: data.reason.trim(),
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
        start_date: data.start_date,
        end_date: data.end_date,
        reason: data.reason.trim(),
      });
      setIsSubmissionConfirmed(true);
      toast.success('Excuse request submitted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit long leave request';
      setSubmitErrorMessage(message);
    }
  };

  const handleBackToStepOne = () => {
    resetMemberLookup();
    clearLookupError();
    setActiveWizardStep(1);
  };

  const handleConfirmProfile = () => {
    setActiveWizardStep(3);
  };

  const handleResetForm = () => {
    resetMemberLookup();
    longLeaveForm.reset({
      start_date: '',
      end_date: '',
      reason: '',
    });
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

  return {
    activeWizardStep,
    setActiveWizardStep,
    // Step 1 Lookup
    isVerifyingSignedInMember,
    lookupForm,
    handleLookupSubmit,
    isLookupPending,
    lookupErrorMessage,
    clearLookupError,
    isRegistrationBlocked,
    memberIdHighlight,
    handleBackToStepOne,
    // Step 2 Confirm
    matchedMember,
    isSignedIn,
    handleConfirmProfile,
    // Step 3 Details
    longLeaveForm,
    onSubmitLongLeave,
    isSubmitting: submitMutation.isPending,
    submitErrorMessage,
    goHome,
    // Success State
    isSubmissionConfirmed,
    submissionResult,
    volunteerName,
    volunteerMemberId,
    handleResetForm,
  };
}
