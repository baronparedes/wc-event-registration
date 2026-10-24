/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryClient } from '@/__tests__/unit-test-utils';

// We'll fully mock the wizard hook to easily test the page's render states without testing the hook's implementation
import { useLongLeaveRequestPageState } from '../hooks/useLongLeaveRequestPageState';
import { LongLeaveRequestPage } from '../index';

vi.mock('@/hooks/domain/members', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    useCurrentProfileQuery: vi.fn(),
  };
});

vi.mock('@/hooks/domain/services', () => ({
  useSubmitExcuseMutation: vi.fn(),
}));

vi.mock('@/hooks/domain/approvals', () => ({
  useSlodUsersQuery: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('react-hook-form', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useWatch: vi.fn(),
  };
});

vi.mock('../hooks/useLongLeaveRequestPageState', () => ({
  useLongLeaveRequestPageState: vi.fn(),
}));

describe('LongLeaveRequestPage Wizard', () => {
  const mockUseLongLeaveRequestPageState = vi.mocked(useLongLeaveRequestPageState);
  const mockSubmit = vi.fn();
  const mockGoHome = vi.fn();
  const mockReset = vi.fn();

  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();

    mockUseLongLeaveRequestPageState.mockReturnValue({
      activeWizardStep: 1,
      isVerifyingSignedInMember: false,
      lookupForm: {
        control: {},
        formState: { errors: {} },
        register: vi.fn(() => ({ ref: vi.fn() })),
        handleSubmit: vi.fn((fn) => fn),
      } as any,
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
      longLeaveForm: {
        control: {},
        formState: { errors: {} },
        register: vi.fn(),
        handleSubmit: vi.fn((fn) => fn),
        setValue: vi.fn(),
      } as any,
      onSubmitLongLeave: mockSubmit,
      isSubmitting: false,
      submitErrorMessage: null,
      goHome: mockGoHome,
      isSubmissionConfirmed: false,
      submissionResult: null,
      volunteerName: 'Test Volunteer',
      volunteerMemberId: 'MEM-1',
      handleResetForm: mockReset,
    } as any);
  });

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LongLeaveRequestPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );
  };

  it('renders Step 1', () => {
    renderPage();
    expect(screen.getByText('Volunteer Long Leave Request')).toBeInTheDocument();
    expect(screen.getByText('Identify')).toBeInTheDocument();
  });

  it('renders Step 2', () => {
    mockUseLongLeaveRequestPageState.mockReturnValue({
      ...mockUseLongLeaveRequestPageState(),
      activeWizardStep: 2,
      matchedMember: {
        first_name: 'Test',
        last_initial: 'M',
        member_id: 'MEM-2',
      },
    } as any);
    renderPage();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('renders Confirmation', () => {
    mockUseLongLeaveRequestPageState.mockReturnValue({
      ...mockUseLongLeaveRequestPageState(),
      isSubmissionConfirmed: true,
      submissionResult: {
        start_date: '2026-10-25',
        end_date: '2026-11-22',
        reason: 'Vacation',
      },
    } as any);
    renderPage();
    expect(screen.getByText('Long Leave Request Submitted!')).toBeInTheDocument();
  });
});
