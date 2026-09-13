import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import { FormSubmissionPage } from '../index';

const { mockUseFormSubmissionPageState, mockNavigate } = vi.hoisted(() => ({
  mockUseFormSubmissionPageState: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('../hooks/useFormSubmissionPageState', () => ({
  useFormSubmissionPageState: () => mockUseFormSubmissionPageState(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ slug: 'test-form' }),
}));

vi.mock('@/hooks/domain/members/queries/useMemberAvatarQuery', () => ({
  useMemberAvatarQuery: () => ({ data: null }),
}));

describe('FormSubmissionPage', () => {
  const baseState = {
    slug: 'test-form',
    formQuery: {
      isLoading: false,
      isError: false,
      data: { id: '1', title: 'Test Form', status: 'published' },
    },
    form: {
      id: '1',
      slug: 'test-form',
      title: 'Test Form',
      description: '<p>Form description</p>',
      status: 'published' as const,
      duplicate_policy: 'block' as const,
      audience: 'members_and_public' as const,
      metadata: {},
      created_by_admin_id: 'admin',
      created_at: '2026-09-01T00:00:00Z',
      updated_at: '2026-09-01T00:00:00Z',
    },
    isPublished: true,
    audience: 'members_and_public' as const,
    respondentType: 'member' as const,
    activeWizardStep: 1,
    fields: [
      {
        id: 'f-1',
        form_id: '1',
        field_key: 'feedback',
        label: 'Feedback',
        field_type: 'text' as const,
        is_required: true,
        is_active: true,
        placeholder: 'Enter feedback',
        help_text: null,
        options: [],
        validation_rules: {},
        field_applicability: 'all' as const,
        display_order: 1,
        created_at: '2026-09-01T00:00:00Z',
        updated_at: '2026-09-01T00:00:00Z',
      },
    ],
    fieldsLoading: false,
    fieldsError: false,
    dynamicForm: {
      register: vi.fn(),
      handleSubmit: vi.fn((fn) => (e?: unknown) => {
        if (e && typeof (e as { preventDefault?: () => void }).preventDefault === 'function') {
          (e as { preventDefault: () => void }).preventDefault();
        }
        return fn({});
      }),
      formState: { errors: {} },
      watch: vi.fn(() => ({})),
      getValues: vi.fn(() => ({})),
      reset: vi.fn(),
      clearErrors: vi.fn(),
    },
    memberLookup: {
      lookupForm: {
        register: vi.fn(() => ({
          ref: vi.fn(),
          name: 'memberId',
          onBlur: vi.fn(),
          onChange: vi.fn(),
        })),
        handleSubmit: vi.fn((fn) => () => fn({ memberId: 'WC-001' })),
        formState: { errors: {} },
      },
      handleLookupSubmit: vi.fn(),
      isLookupPending: false,
      memberIdHighlight: false,
      isRegistrationBlocked: false,
      isUpdateMode: false,
      matchedMember: null,
      reset: vi.fn(),
    },
    memberIdInputRef: { current: null },
    lookupErrorMessage: null,
    handleLookupSubmit: vi.fn(),
    clearLookupError: vi.fn(),
    isSignedIn: false,
    isVerifyingSignedInMember: false,
    guestInfo: null,
    handleGuestInfoSubmit: vi.fn(),
    switchToGuestMode: vi.fn(),
    switchToMemberMode: vi.fn(),
    continueToQuestions: vi.fn(),
    handleBackToStepOne: vi.fn(),
    handleBackToStepTwo: vi.fn(),
    handleSubmitForm: vi.fn(),
    isSubmitting: false,
    submitErrorMessage: null,
    submitSuccessMessage: null,
    isSubmissionConfirmed: false,
    submissionResult: null,
    resetForm: vi.fn(),
    goHome: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when form query is loading', () => {
    mockUseFormSubmissionPageState.mockReturnValue({
      ...baseState,
      formQuery: { isLoading: true, isError: false, data: null },
    });

    render(<FormSubmissionPage />);
    expect(screen.getByText('Loading Form...')).toBeInTheDocument();
  });

  it('renders unavailable state when form is not found or not published, and navigates', () => {
    mockUseFormSubmissionPageState.mockReturnValue({
      ...baseState,
      formQuery: { isLoading: false, isError: false, data: null },
      form: null,
      isPublished: false,
    });

    render(<FormSubmissionPage />);
    expect(screen.getByText('Form Unavailable')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Go Home' }));
    expect(mockNavigate).toHaveBeenCalledWith(ROUTE_PATHS.home);

    fireEvent.click(screen.getByRole('button', { name: 'Go Back' }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('renders form header, steps and member lookup for member mode step 1, allows guest switch', () => {
    const mockSwitchToGuest = vi.fn();
    mockUseFormSubmissionPageState.mockReturnValue({
      ...baseState,
      activeWizardStep: 1,
      respondentType: 'member',
      switchToGuestMode: mockSwitchToGuest,
    });

    render(<FormSubmissionPage />);
    expect(screen.getByText('Test Form')).toBeInTheDocument();
    expect(screen.getByText('Identify')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Questions')).toBeInTheDocument();

    const guestBtn = screen.getByRole('button', { name: 'Fill out as Guest' });
    fireEvent.click(guestBtn);
    expect(mockSwitchToGuest).toHaveBeenCalledTimes(1);
  });

  it('renders guest info step card when respondentType is guest on step 1, allows member switch', () => {
    const mockSwitchToMember = vi.fn();
    mockUseFormSubmissionPageState.mockReturnValue({
      ...baseState,
      respondentType: 'guest',
      activeWizardStep: 1,
      switchToMemberMode: mockSwitchToMember,
    });

    render(<FormSubmissionPage />);
    expect(screen.getByText('Step 1: Respondent Information')).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Last Name/i)).toBeInTheDocument();

    const memberBtn = screen.getByRole('button', { name: 'I am a Member' });
    fireEvent.click(memberBtn);
    expect(mockSwitchToMember).toHaveBeenCalledTimes(1);
  });

  it('renders profile card on member step 2, handles continue and change member', () => {
    const mockContinue = vi.fn();
    const mockBackToOne = vi.fn();

    mockUseFormSubmissionPageState.mockReturnValue({
      ...baseState,
      respondentType: 'member',
      activeWizardStep: 2,
      continueToQuestions: mockContinue,
      handleBackToStepOne: mockBackToOne,
      memberLookup: {
        ...baseState.memberLookup,
        matchedMember: {
          user_id: 'u-1',
          first_name: 'Jane',
          last_name: 'Doe',
          full_name: 'Jane Doe',
          nickname: 'Janey',
        },
      },
    });

    render(<FormSubmissionPage />);
    expect(screen.getByText('Step 2: Confirm Your Details')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Yes, I confirm' }));
    expect(mockContinue).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Scan Another Member' }));
    expect(mockBackToOne).toHaveBeenCalledTimes(1);
  });

  it('renders questions step card on step 3 for member and triggers back to step 2', () => {
    const mockBackToTwo = vi.fn();

    mockUseFormSubmissionPageState.mockReturnValue({
      ...baseState,
      respondentType: 'member',
      activeWizardStep: 3,
      handleBackToStepTwo: mockBackToTwo,
    });

    render(<FormSubmissionPage />);
    expect(screen.getByText('Step 2: Questions')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(mockBackToTwo).toHaveBeenCalledTimes(1);
  });

  it('renders questions step card on step 2 for guest and triggers back to step 1', () => {
    const mockBackToOne = vi.fn();

    mockUseFormSubmissionPageState.mockReturnValue({
      ...baseState,
      respondentType: 'guest',
      activeWizardStep: 2,
      handleBackToStepOne: mockBackToOne,
    });

    render(<FormSubmissionPage />);
    expect(screen.getByText('Step 2: Questions')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(mockBackToOne).toHaveBeenCalledTimes(1);
  });

  it('renders confirmation card when submission is confirmed and handles actions', () => {
    const mockReset = vi.fn();
    const mockGoHome = vi.fn();

    mockUseFormSubmissionPageState.mockReturnValue({
      ...baseState,
      isSubmissionConfirmed: true,
      submissionResult: {
        submission_id: 'sub-999',
        status: 'submitted',
      },
      resetForm: mockReset,
      goHome: mockGoHome,
    });

    render(<FormSubmissionPage />);
    expect(screen.getByText('Form Submitted!')).toBeInTheDocument();
    expect(screen.getByText(/sub-999/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Another Response' }));
    expect(mockReset).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Go Home' }));
    expect(mockGoHome).toHaveBeenCalledTimes(1);
  });
});
