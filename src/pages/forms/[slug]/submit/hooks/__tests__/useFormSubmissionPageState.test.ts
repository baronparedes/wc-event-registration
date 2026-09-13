import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import { useFormSubmissionPageState } from '../useFormSubmissionPageState';

const {
  mockUseParams,
  mockNavigate,
  mockUseFormBySlugQuery,
  mockUsePublicFormFieldsQuery,
  mockUseSubmitFormMutation,
  mockUseMemberLookupState,
  mockUseCurrentProfileQuery,
  mockMutateAsync,
  mockMemberLookupSubmit,
  mockResetLookup,
} = vi.hoisted(() => {
  const mockMutateAsync = vi.fn();
  const mockMemberLookupSubmit = vi.fn();
  const mockResetLookup = vi.fn();

  return {
    mockUseParams: vi.fn(),
    mockNavigate: vi.fn(),
    mockUseFormBySlugQuery: vi.fn(),
    mockUsePublicFormFieldsQuery: vi.fn(),
    mockUseSubmitFormMutation: vi.fn(),
    mockUseMemberLookupState: vi.fn(),
    mockUseCurrentProfileQuery: vi.fn(),
    mockMutateAsync,
    mockMemberLookupSubmit,
    mockResetLookup,
  };
});

vi.mock('react-router-dom', () => ({
  useParams: () => mockUseParams(),
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/domain/forms', () => ({
  useFormBySlugQuery: (...args: unknown[]) => mockUseFormBySlugQuery(...args),
  usePublicFormFieldsQuery: (...args: unknown[]) => mockUsePublicFormFieldsQuery(...args),
  useSubmitFormMutation: () => mockUseSubmitFormMutation(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useCurrentProfileQuery: () => mockUseCurrentProfileQuery(),
  useMemberLookupState: (...args: unknown[]) => mockUseMemberLookupState(...args),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('useFormSubmissionPageState', () => {
  const sampleForm = {
    id: 'form-123',
    slug: 'sample-form',
    title: 'Sample Form',
    description: 'Sample description',
    status: 'published',
    duplicate_policy: 'block',
    audience: 'members_and_public',
    metadata: {},
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  };

  const sampleFields = [
    {
      id: 'field-1',
      form_id: 'form-123',
      field_key: 'comments',
      label: 'Comments',
      field_type: 'text' as const,
      is_required: true,
      is_active: true,
      placeholder: 'Enter comments',
      help_text: null,
      options: [],
      validation_rules: {},
      field_applicability: 'all' as const,
      display_order: 1,
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseParams.mockReturnValue({ slug: 'sample-form' });
    mockUseFormBySlugQuery.mockReturnValue({
      data: sampleForm,
      isLoading: false,
      isError: false,
    });
    mockUsePublicFormFieldsQuery.mockReturnValue({
      data: sampleFields,
      isLoading: false,
      isError: false,
    });
    mockUseSubmitFormMutation.mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
    mockUseCurrentProfileQuery.mockReturnValue({
      data: null,
      isLoading: false,
    });
    mockUseMemberLookupState.mockReturnValue({
      matchedMember: null,
      verifiedMemberCredential: null,
      memberIdHighlight: false,
      isRegistrationBlocked: false,
      isUpdateMode: false,
      lockedStepMessage: null,
      prefillResponses: null,
      lookupForm: {
        handleSubmit: (cb: (data: unknown) => void) => () => cb({ memberId: 'WC-001' }),
        register: () => ({}),
        formState: { errors: {} },
      },
      isLookupPending: false,
      handleLookupSubmit: mockMemberLookupSubmit,
      clearMember: vi.fn(),
      reset: mockResetLookup,
    });
  });

  it('initializes with member mode for members_and_public form', () => {
    const { result } = renderHook(() => useFormSubmissionPageState());

    expect(result.current.respondentType).toBe('member');
    expect(result.current.activeWizardStep).toBe(1);
    expect(result.current.fields).toHaveLength(1);
  });

  it('initializes with guest mode when form audience is public', () => {
    mockUseFormBySlugQuery.mockReturnValue({
      data: { ...sampleForm, audience: 'public' },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    expect(result.current.respondentType).toBe('guest');
    expect(result.current.activeWizardStep).toBe(1);
  });

  it('allows switching between member and guest mode', () => {
    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.switchToGuestMode();
    });

    expect(result.current.respondentType).toBe('guest');
    expect(result.current.activeWizardStep).toBe(1);

    act(() => {
      result.current.switchToMemberMode();
    });

    expect(result.current.respondentType).toBe('member');
    expect(result.current.activeWizardStep).toBe(1);
  });

  it('advances to step 2 upon successful member lookup', async () => {
    mockMemberLookupSubmit.mockResolvedValueOnce({
      success: true,
      mode: 'new_registration',
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: 'WC-001' });
    });

    expect(result.current.activeWizardStep).toBe(2);
  });

  it('sets lookup error message when member lookup fails', async () => {
    mockMemberLookupSubmit.mockResolvedValueOnce({
      success: false,
      error: 'Member not found',
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: 'INVALID' });
    });

    expect(result.current.lookupErrorMessage).toBe('Member not found');
    expect(result.current.activeWizardStep).toBe(1);

    act(() => {
      result.current.clearLookupError();
    });
    expect(result.current.lookupErrorMessage).toBeNull();
  });

  it('navigates to step 2 when member lookup returns already_registered', async () => {
    mockMemberLookupSubmit.mockResolvedValueOnce({
      success: false,
      reason: 'already_registered',
      error: 'You have already submitted this form.',
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: 'WC-001' });
    });

    expect(result.current.activeWizardStep).toBe(2);
  });

  it('advances to step 2 upon guest info submit', () => {
    mockUseFormBySlugQuery.mockReturnValue({
      data: { ...sampleForm, audience: 'public' },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.handleGuestInfoSubmit({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '1234567890',
      });
    });

    expect(result.current.guestInfo?.email).toBe('john@example.com');
    expect(result.current.activeWizardStep).toBe(2);
  });

  it('submits form responses successfully for guest and confirms', async () => {
    mockUseFormBySlugQuery.mockReturnValue({
      data: { ...sampleForm, audience: 'public' },
      isLoading: false,
      isError: false,
    });

    mockMutateAsync.mockResolvedValueOnce({
      success: true,
      submission_id: 'sub-abc-123',
      status: 'submitted',
      is_new: true,
      message: 'Form submitted successfully',
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.handleGuestInfoSubmit({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });
    });

    await act(async () => {
      await result.current.handleSubmitForm({
        comments: 'Great initiative!',
      });
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        form_slug: 'sample-form',
        public_registrant_info: expect.objectContaining({
          email: 'john@example.com',
        }),
        responses: {
          comments: 'Great initiative!',
        },
      }),
    );
    expect(result.current.isSubmissionConfirmed).toBe(true);
    expect(result.current.submissionResult?.submission_id).toBe('sub-abc-123');
  });

  it('handles duplicate blocked submission error gracefully', async () => {
    mockUseFormBySlugQuery.mockReturnValue({
      data: { ...sampleForm, audience: 'public' },
      isLoading: false,
      isError: false,
    });

    mockMutateAsync.mockResolvedValueOnce({
      success: false,
      error_code: 'duplicate_blocked',
      error: 'You have already submitted this form.',
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.handleGuestInfoSubmit({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });
    });

    await act(async () => {
      await result.current.handleSubmitForm({
        comments: 'Duplicate attempt',
      });
    });

    expect(result.current.isSubmissionConfirmed).toBe(false);
    expect(result.current.submitErrorMessage).toBe('You have already submitted this form.');
  });

  it('auto-verifies signed-in member profile directly into questions step (step 3)', async () => {
    mockUseCurrentProfileQuery.mockReturnValue({
      data: { member_id: 'WC-AUTO-01' },
      isLoading: false,
    });

    mockMemberLookupSubmit.mockResolvedValueOnce({
      success: true,
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMemberLookupSubmit).toHaveBeenCalledWith({ memberId: 'WC-AUTO-01' });
    expect(result.current.activeWizardStep).toBe(3);
  });

  it('handles auto-verify failure gracefully for signed-in profile', async () => {
    mockUseCurrentProfileQuery.mockReturnValue({
      data: { member_id: 'WC-AUTO-ERR' },
      isLoading: false,
    });

    mockMemberLookupSubmit.mockResolvedValueOnce({
      success: false,
      error: 'Auto verification failed',
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMemberLookupSubmit).toHaveBeenCalledWith({ memberId: 'WC-AUTO-ERR' });
    expect(result.current.lookupErrorMessage).toBe('Auto verification failed');
    expect(result.current.activeWizardStep).toBe(1);
  });

  it('navigates to step 2 when signed-in member auto-lookup returns already_registered', async () => {
    mockUseCurrentProfileQuery.mockReturnValue({
      data: { member_id: 'WC-AUTO-DUP' },
      isLoading: false,
    });

    mockMemberLookupSubmit.mockResolvedValueOnce({
      success: false,
      reason: 'already_registered',
      error: 'You have already submitted this form.',
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockMemberLookupSubmit).toHaveBeenCalledWith({ memberId: 'WC-AUTO-DUP' });
    expect(result.current.activeWizardStep).toBe(2);
  });

  it('prevents submission if form or slug is missing', async () => {
    mockUseParams.mockReturnValue({ slug: undefined });
    mockUseFormBySlugQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    await act(async () => {
      await result.current.handleSubmitForm({ comments: 'test' });
    });

    expect(result.current.submitErrorMessage).toBe('Form is not available.');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('prevents member submission if member is not verified', async () => {
    mockUseMemberLookupState.mockReturnValue({
      matchedMember: null,
      verifiedMemberCredential: null,
      prefillResponses: null,
      lookupForm: {
        handleSubmit: (cb: (data: unknown) => void) => () => cb({ memberId: 'WC-001' }),
        register: () => ({}),
        formState: { errors: {} },
      },
      isLookupPending: false,
      handleLookupSubmit: mockMemberLookupSubmit,
      clearMember: vi.fn(),
      reset: mockResetLookup,
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    await act(async () => {
      await result.current.handleSubmitForm({ comments: 'test' });
    });

    expect(result.current.submitErrorMessage).toBe('Member lookup is required');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('prevents guest submission if guest info is missing', async () => {
    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.switchToGuestMode();
    });

    await act(async () => {
      await result.current.handleSubmitForm({ comments: 'test' });
    });

    expect(result.current.submitErrorMessage).toBe('Guest information is required.');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('stops submission and sets field errors when dynamic response validation fails', async () => {
    mockUseFormBySlugQuery.mockReturnValue({
      data: { ...sampleForm, audience: 'public' },
      isLoading: false,
      isError: false,
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.handleGuestInfoSubmit({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });
    });

    await act(async () => {
      // Empty string for required comments field
      await result.current.handleSubmitForm({ comments: '' });
    });

    expect(mockMutateAsync).not.toHaveBeenCalled();
    expect(result.current.fieldErrorMessage('comments')).toBeDefined();
  });

  it('handles VALIDATION_FAILED response from server', async () => {
    mockUseFormBySlugQuery.mockReturnValue({
      data: { ...sampleForm, audience: 'public' },
      isLoading: false,
      isError: false,
    });

    mockMutateAsync.mockResolvedValueOnce({
      success: false,
      error_code: 'VALIDATION_FAILED',
      errors: [{ fieldKey: 'comments', message: 'Comment contains inappropriate language' }],
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.handleGuestInfoSubmit({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });
    });

    await act(async () => {
      await result.current.handleSubmitForm({ comments: 'Profanity' });
    });

    expect(result.current.submitErrorMessage).toBe(
      'Some answers need attention. Please review highlighted fields.',
    );
  });

  it('handles generic submission failure response from server', async () => {
    mockUseFormBySlugQuery.mockReturnValue({
      data: { ...sampleForm, audience: 'public' },
      isLoading: false,
      isError: false,
    });

    mockMutateAsync.mockResolvedValueOnce({
      success: false,
      error: 'Submission service temporarily unavailable',
    });

    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.handleGuestInfoSubmit({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });
    });

    await act(async () => {
      await result.current.handleSubmitForm({ comments: 'test' });
    });

    expect(result.current.submitErrorMessage).toBe('Submission service temporarily unavailable');
  });

  it('handles thrown exceptions during submission gracefully', async () => {
    mockUseFormBySlugQuery.mockReturnValue({
      data: { ...sampleForm, audience: 'public' },
      isLoading: false,
      isError: false,
    });

    mockMutateAsync.mockRejectedValueOnce(new Error('Network error occurred'));

    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.handleGuestInfoSubmit({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });
    });

    await act(async () => {
      await result.current.handleSubmitForm({ comments: 'test' });
    });

    expect(result.current.submitErrorMessage).toBe('Network error occurred');
  });

  it('handles thrown duplicate error message during submission', async () => {
    mockUseFormBySlugQuery.mockReturnValue({
      data: { ...sampleForm, audience: 'public' },
      isLoading: false,
      isError: false,
    });

    mockMutateAsync.mockRejectedValueOnce(new Error('User has already submitted this form'));

    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.handleGuestInfoSubmit({
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
      });
    });

    await act(async () => {
      await result.current.handleSubmitForm({ comments: 'test' });
    });

    expect(result.current.submitErrorMessage).toBe('You have already submitted this form.');
  });

  it('supports navigation helpers and resetForm', () => {
    const { result } = renderHook(() => useFormSubmissionPageState());

    act(() => {
      result.current.continueToQuestions();
    });
    expect(result.current.activeWizardStep).toBe(3);

    act(() => {
      result.current.handleBackToStepTwo();
    });
    expect(result.current.activeWizardStep).toBe(2);

    act(() => {
      result.current.handleBackToStepOne();
    });
    expect(result.current.activeWizardStep).toBe(1);

    act(() => {
      result.current.resetForm();
    });
    expect(result.current.activeWizardStep).toBe(1);
    expect(result.current.isSubmissionConfirmed).toBe(false);

    act(() => {
      result.current.goHome();
    });
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.home);
  });
});
