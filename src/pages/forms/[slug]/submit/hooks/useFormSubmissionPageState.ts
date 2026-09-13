import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { FORM_MESSAGES, ROUTE_PATHS } from '@/config/constants';
import {
  useFormBySlugQuery,
  usePublicFormFieldsQuery,
  useSubmitFormMutation,
} from '@/hooks/domain/forms';
import { useCurrentProfileQuery, useMemberLookupState } from '@/hooks/domain/members';
import { useErrorWithFadeout } from '@/hooks/utils';
import {
  type DynamicFieldResponseValues,
  buildDynamicFieldResponseSchema,
  createDynamicFieldDefaultValues,
  filterVisibleFieldValues,
  isFieldVisible,
} from '@/lib/domain';
import { logger } from '@/lib/infrastructure';

import { type GuestInfoValues, toPublicField } from '../components';

export type RespondentType = 'member' | 'guest';

export function useFormSubmissionPageState() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const formQuery = useFormBySlugQuery(slug);
  const form = formQuery.data;
  const isPublished = form?.status === 'published';
  const audience = form?.audience ?? 'members';

  // Respondent mode: user override or default to audience setting
  const [userSelectedRespondentType, setUserSelectedRespondentType] =
    useState<RespondentType | null>(null);
  const respondentType: RespondentType =
    userSelectedRespondentType ?? (audience === 'public' ? 'guest' : 'member');

  // Wizard step: 1 (identity/info), 2 (profile confirm or questions), 3 (questions or complete)
  const [activeWizardStep, setActiveWizardStep] = useState<number>(1);

  // Guest info state
  const [guestInfo, setGuestInfo] = useState<GuestInfoValues | null>(null);

  // Member lookup state with formSlug
  const memberLookupConfig = useMemo(() => ({ formSlug: slug }), [slug]);
  const memberLookup = useMemberLookupState(memberLookupConfig);
  const {
    handleLookupSubmit: runMemberLookupSubmit,
    reset: resetMemberLookup,
    matchedMember,
    verifiedMemberCredential,
    prefillResponses,
  } = memberLookup;

  const {
    error: lookupErrorMessage,
    showError: showLookupError,
    clearError: clearLookupError,
  } = useErrorWithFadeout();

  const memberIdInputRef = useRef<HTMLInputElement | null>(null);

  // Profile auto-detection for signed-in members
  const { data: currentProfile, isLoading: isProfileLoading } = useCurrentProfileQuery();
  const isSignedIn = Boolean(currentProfile?.member_id);
  const [autoLookupStatus, setAutoLookupStatus] = useState<'idle' | 'executing' | 'completed'>(
    'idle',
  );
  const isVerifyingSignedInMember =
    isSignedIn && respondentType === 'member' && autoLookupStatus === 'executing';

  // Active fields query
  const audienceFilter = respondentType === 'member' ? 'members' : 'public';
  const formFieldsQuery = usePublicFormFieldsQuery(form?.id, audienceFilter);
  const fields = useMemo(() => formFieldsQuery.data ?? [], [formFieldsQuery.data]);
  const publicFields = useMemo(() => fields.map(toPublicField), [fields]);

  // Dynamic field responses form
  const dynamicForm = useForm<DynamicFieldResponseValues>({
    mode: 'onBlur',
    defaultValues: {},
  });

  // Submission mutation & state
  const submitMutation = useSubmitFormMutation();
  const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(null);
  const [submitSuccessMessage, setSubmitSuccessMessage] = useState<string | null>(null);
  const [isSubmissionConfirmed, setIsSubmissionConfirmed] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    submission_id: string;
    status: 'submitted' | 'updated';
  } | null>(null);

  // Reset form fields when fields change or prefill arrives
  useEffect(() => {
    const defaults = createDynamicFieldDefaultValues(publicFields);
    const prefill = prefillResponses ?? {};
    dynamicForm.reset({ ...defaults, ...prefill });
    dynamicForm.clearErrors();
  }, [publicFields, prefillResponses, dynamicForm]);

  // Handle member lookup submit
  const handleLookupSubmit = useCallback(
    async (values: Parameters<typeof runMemberLookupSubmit>[0]) => {
      setSubmitErrorMessage(null);
      setSubmitSuccessMessage(null);
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
      !form ||
      !isPublished ||
      respondentType !== 'member' ||
      isProfileLoading ||
      !currentProfile?.member_id ||
      matchedMember ||
      autoLookupStatus !== 'idle'
    ) {
      return;
    }

    let isMounted = true;

    void Promise.resolve().then(async () => {
      if (!isMounted) return;

      setAutoLookupStatus('executing');
      const result = await runMemberLookupSubmit({ memberId: currentProfile.member_id });
      if (!isMounted) return;

      setAutoLookupStatus('completed');
      if (result.success) {
        setActiveWizardStep(3);
      } else {
        showLookupError(result.error || FORM_MESSAGES.memberLookupFailed);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [
    form,
    isPublished,
    respondentType,
    isProfileLoading,
    currentProfile?.member_id,
    matchedMember,
    autoLookupStatus,
    runMemberLookupSubmit,
    showLookupError,
  ]);

  // Handle guest info submit
  const handleGuestInfoSubmit = useCallback((data: GuestInfoValues) => {
    setGuestInfo(data);
    setSubmitErrorMessage(null);
    setSubmitSuccessMessage(null);
    setIsSubmissionConfirmed(false);
    setActiveWizardStep(2);
  }, []);

  // Switch between member and guest mode
  const switchToGuestMode = useCallback(() => {
    resetMemberLookup();
    clearLookupError();
    setUserSelectedRespondentType('guest');
    setActiveWizardStep(1);
  }, [clearLookupError, resetMemberLookup]);

  const switchToMemberMode = useCallback(() => {
    setGuestInfo(null);
    setUserSelectedRespondentType('member');
    setActiveWizardStep(1);
  }, []);

  // Continue from Step 2 to Step 3 for member flow
  const continueToQuestions = useCallback(() => {
    setActiveWizardStep(3);
  }, []);

  // Back navigation
  const handleBackToStepOne = useCallback(() => {
    setActiveWizardStep(1);
  }, []);

  const handleBackToStepTwo = useCallback(() => {
    setActiveWizardStep(2);
  }, []);

  // Submit form responses
  const handleSubmitForm = useCallback(
    async (values: DynamicFieldResponseValues) => {
      if (!slug || !form) {
        setSubmitErrorMessage('Form is not available.');
        return;
      }

      setSubmitErrorMessage(null);
      setSubmitSuccessMessage(null);
      dynamicForm.clearErrors();

      // Filter visible fields and validate against schema
      const formValues = dynamicForm.getValues();
      const visibleFields = publicFields.filter((field) =>
        isFieldVisible(field, publicFields, formValues),
      );
      const visibleSchema = buildDynamicFieldResponseSchema(visibleFields);

      const parsed = visibleSchema.safeParse(values);
      if (!parsed.success) {
        parsed.error.issues.forEach((issue: z.ZodIssue) => {
          const key = issue.path[0];
          if (typeof key === 'string') {
            dynamicForm.setError(key, {
              message: issue.message,
              type: 'manual',
            });
          }
        });
        return;
      }

      const cleanedResponses = filterVisibleFieldValues(publicFields, parsed.data);
      const idempotencyKey = crypto.randomUUID();

      let memberIdToSubmit: string | undefined;
      if (respondentType === 'member') {
        memberIdToSubmit = verifiedMemberCredential ?? currentProfile?.member_id ?? undefined;
        if (!memberIdToSubmit) {
          setSubmitErrorMessage(FORM_MESSAGES.memberLookupRequired);
          return;
        }
      }

      let guestInfoToSubmit: GuestInfoValues | undefined;
      if (respondentType === 'guest') {
        if (!guestInfo) {
          setSubmitErrorMessage('Guest information is required.');
          return;
        }
        guestInfoToSubmit = guestInfo;
      }

      try {
        const result = await submitMutation.mutateAsync({
          form_slug: slug,
          member_id: memberIdToSubmit,
          public_registrant_info: guestInfoToSubmit
            ? {
                first_name: guestInfoToSubmit.first_name,
                last_name: guestInfoToSubmit.last_name,
                email: guestInfoToSubmit.email,
                phone: guestInfoToSubmit.phone,
              }
            : undefined,
          responses: cleanedResponses,
          idempotency_key: idempotencyKey,
        });

        if (!result.success) {
          if (result.error_code === 'duplicate_blocked') {
            setSubmitErrorMessage('You have already submitted this form.');
            toast.error('You have already submitted this form.');
          } else if (result.error_code === 'VALIDATION_FAILED' && Array.isArray(result.errors)) {
            result.errors.forEach((err: { fieldKey: string; message: string }) => {
              dynamicForm.setError(err.fieldKey, {
                type: 'manual',
                message: err.message,
              });
            });
            setSubmitErrorMessage('Some answers need attention. Please review highlighted fields.');
            toast.error('Some answers need attention. Please review highlighted fields.');
          } else {
            setSubmitErrorMessage(result.error || 'Failed to submit form.');
            toast.error(result.error || 'Failed to submit form.');
          }
          return;
        }

        setSubmissionResult({
          submission_id: result.submission_id,
          status: result.status,
        });
        setIsSubmissionConfirmed(true);
        setSubmitSuccessMessage(result.message);
        toast.success(result.message || 'Form submitted successfully!');
      } catch (error) {
        logger.error('Form submission error:', error);
        const message = error instanceof Error ? error.message : 'Failed to submit form.';
        if (message.includes('already submitted') || message.includes('duplicate_blocked')) {
          setSubmitErrorMessage('You have already submitted this form.');
          toast.error('You have already submitted this form.');
        } else {
          setSubmitErrorMessage(message);
          toast.error(message);
        }
      }
    },
    [
      slug,
      form,
      dynamicForm,
      publicFields,
      respondentType,
      verifiedMemberCredential,
      currentProfile?.member_id,
      guestInfo,
      submitMutation,
    ],
  );

  // Full reset
  const resetForm = useCallback(() => {
    resetMemberLookup();
    clearLookupError();
    setGuestInfo(null);
    setUserSelectedRespondentType(null);
    setIsSubmissionConfirmed(false);
    setSubmissionResult(null);
    setSubmitErrorMessage(null);
    setSubmitSuccessMessage(null);
    dynamicForm.reset(createDynamicFieldDefaultValues(publicFields));
    setAutoLookupStatus('idle');
    setActiveWizardStep(1);
  }, [clearLookupError, dynamicForm, publicFields, resetMemberLookup]);

  const fieldErrorMessage = useCallback(
    (fieldKey: string): string | undefined => {
      const error = dynamicForm.formState.errors[fieldKey];
      if (!error) return undefined;
      return typeof error.message === 'string' ? error.message : 'This field is invalid.';
    },
    [dynamicForm.formState.errors],
  );

  return {
    slug,
    formQuery,
    form,
    isPublished,
    audience,
    respondentType,
    activeWizardStep,
    fields,
    fieldsLoading: formFieldsQuery.isLoading,
    fieldsError: formFieldsQuery.isError,
    dynamicForm,
    fieldErrorMessage,
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
    isSubmitting: submitMutation.isPending,
    submitErrorMessage,
    submitSuccessMessage,
    isSubmissionConfirmed,
    submissionResult,
    resetForm,
    goHome: () => navigate(ROUTE_PATHS.home),
  };
}
