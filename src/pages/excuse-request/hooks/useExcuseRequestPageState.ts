import { useCallback, useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { FORM_MESSAGES, ROUTE_PATHS } from '@/config/constants';
import { useCurrentProfileQuery, useMemberLookupState } from '@/hooks/domain/members';
import { useSubmitExcuseMutation } from '@/hooks/domain/services';
import { useErrorWithFadeout } from '@/hooks/utils';
import { type SubmitServiceExcuseInput } from '@/lib/domain/services';

import { parseDateOnly } from '../utils';

export const excuseFormSchema = z.object({
  request_date: z
    .string()
    .trim()
    .min(1, 'Please select a Sunday service date')
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please select a valid Sunday date')
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
  reason: z
    .string()
    .trim()
    .min(1, 'Please provide a reason for your absence')
    .max(500, 'Reason must be 500 characters or less'),
});

export type ExcuseFormValues = z.infer<typeof excuseFormSchema>;

export function useExcuseRequestPageState() {
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
  const excuseForm = useForm<ExcuseFormValues>({
    resolver: zodResolver(excuseFormSchema),
    defaultValues: {
      request_date: '',
      services: [],
      reason: '',
    },
  });

  const selectedServices = useWatch({
    control: excuseForm.control,
    name: 'services',
    defaultValue: [],
  });

  // Submission mutation & state
  const submitMutation = useSubmitExcuseMutation();
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [isSubmissionConfirmed, setIsSubmissionConfirmed] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    request_date: string;
    services: string[];
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

  const handleToggleService = (serviceValue: string) => {
    const current = selectedServices ?? [];
    if (current.includes(serviceValue)) {
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
        request_date: data.request_date,
        services: data.services,
        reason: data.reason.trim(),
      });
      setIsSubmissionConfirmed(true);
      toast.success('Excuse request submitted successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit excuse request';
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
    excuseForm.reset({
      request_date: '',
      services: [],
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
    excuseForm,
    selectedServices,
    handleToggleService,
    onSubmitExcuse,
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
