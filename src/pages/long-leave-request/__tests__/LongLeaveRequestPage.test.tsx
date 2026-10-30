import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import { useLongLeaveRequestPageState } from '../hooks/useLongLeaveRequestPageState';
import { LongLeaveRequestPage } from '../index';

vi.mock('@/hooks/domain/members', () => ({
  useCurrentProfileQuery: vi.fn(),
  useMemberLookupState: vi.fn(),
  useMemberAvatarQuery: vi.fn().mockReturnValue({ data: null }),
}));

vi.mock('@/hooks/domain/services', () => ({
  useSubmitExcuseMutation: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// We'll wrap the component in a test wrapper to provide the real react-hook-form methods
// but still use the mocked useLongLeaveRequestPageState to control the page level state.
vi.mock('../hooks/useLongLeaveRequestPageState', () => ({
  useLongLeaveRequestPageState: vi.fn(),
}));

// A wrapper to inject real useForm instance into the mocked state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const TestWrapper = ({ mockStateOverride }: { mockStateOverride: any }) => {
  const lookupForm = useForm();
  const longLeaveForm = useForm();

  const injectedState = {
    ...mockStateOverride,
    lookupForm,
    longLeaveForm,
  };

  (useLongLeaveRequestPageState as ReturnType<typeof vi.fn>).mockReturnValue(injectedState);

  return <LongLeaveRequestPage />;
};

describe('LongLeaveRequestPage', () => {
  const queryClient = new QueryClient();

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>,
    );
  };

  const defaultMockState = {
    activeWizardStep: 1,
    setActiveWizardStep: vi.fn(),
    isVerifyingSignedInMember: false,
    handleLookupSubmit: vi.fn(),
    isLookupPending: false,
    lookupErrorMessage: null,
    clearLookupError: vi.fn(),
    isRegistrationBlocked: false,
    memberIdHighlight: false,
    handleBackToStepOne: vi.fn(),
    matchedMember: null,
    isSignedIn: false,
    handleConfirmProfile: vi.fn(),
    onSubmitLongLeave: vi.fn(),
    isSubmitting: false,
    submitErrorMessage: null,
    goHome: vi.fn(),
    isSubmissionConfirmed: false,
    submissionResult: null,
    volunteerName: 'Volunteer',
    volunteerMemberId: '',
    handleResetForm: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial lookup step (Step 1) correctly', () => {
    renderWithProviders(
      <TestWrapper mockStateOverride={{ ...defaultMockState, activeWizardStep: 1 }} />,
    );
    expect(screen.getByText('Volunteer Long Leave Request')).toBeInTheDocument();
    expect(screen.getByText('Identify')).toBeInTheDocument();
    expect(screen.getByText('Step 1: Find Your Profile')).toBeInTheDocument();
  });

  it('renders verifying profile loading state', () => {
    renderWithProviders(
      <TestWrapper
        mockStateOverride={{
          ...defaultMockState,
          activeWizardStep: 1,
          isVerifyingSignedInMember: true,
        }}
      />,
    );
    expect(screen.getByText('Checking your member profile...')).toBeInTheDocument();
  });

  it('renders profile confirmation step (Step 2)', () => {
    renderWithProviders(
      <TestWrapper
        mockStateOverride={{
          ...defaultMockState,
          activeWizardStep: 2,
          matchedMember: {
            id: '123',
            first_name: 'Test John',
            last_name: 'Test Doe',
            full_name: 'Test John Doe',
            member_id: 'M123',
          },
        }}
      />,
    );
    // ProfileStepCard relies on ProfileDetails, it should display full name if possible or first name based on components
    // So let's look for "Test John" at least
    expect(screen.getByText('Test John')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /scan another member/i })).toBeInTheDocument();
  });

  it('renders details form step (Step 3)', () => {
    renderWithProviders(
      <TestWrapper mockStateOverride={{ ...defaultMockState, activeWizardStep: 3 }} />,
    );
    expect(screen.getByText('Step 3: Long Leave Details')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit long leave request/i })).toBeInTheDocument();
  });

  it('renders confirmation step correctly', () => {
    renderWithProviders(
      <TestWrapper
        mockStateOverride={{
          ...defaultMockState,
          isSubmissionConfirmed: true,
          submissionResult: {
            start_date: '2023-10-01',
            end_date: '2023-10-29',
            reason: 'Vacation',
          },
          volunteerName: 'Test John Doe',
          volunteerMemberId: 'M123',
        }}
      />,
    );
    expect(screen.getByText('Long Leave Request Submitted!')).toBeInTheDocument();
    expect(screen.getByText('Test John Doe (M123)')).toBeInTheDocument();
    expect(screen.getByText(/"Vacation"/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit another request/i })).toBeInTheDocument();
  });
});
