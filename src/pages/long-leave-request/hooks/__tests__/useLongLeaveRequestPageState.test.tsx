import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { vi } from 'vitest';

import { useCurrentProfileQuery, useMemberLookupState } from '@/hooks/domain/members';
import { useSubmitExcuseMutation } from '@/hooks/domain/services';
import { useErrorWithFadeout } from '@/hooks/utils';

import { longLeaveFormSchema, useLongLeaveRequestPageState } from '../useLongLeaveRequestPageState';

vi.mock('@/hooks/domain/members', () => ({
  useCurrentProfileQuery: vi.fn(),
  useMemberLookupState: vi.fn(),
}));

vi.mock('@/hooks/domain/services', () => ({
  useSubmitExcuseMutation: vi.fn(),
}));

vi.mock('@/hooks/utils', () => ({
  useErrorWithFadeout: vi.fn(),
  useWizardStepScroll: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Provide a mock for navigate since hook uses useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('useLongLeaveRequestPageState', () => {
  const queryClient = new QueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );

  const mockRunMemberLookupSubmit = vi.fn();
  const mockClearLookupError = vi.fn();
  const mockShowLookupError = vi.fn();
  const mockResetMemberLookup = vi.fn();
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    (useErrorWithFadeout as ReturnType<typeof vi.fn>).mockReturnValue({
      error: null,
      showError: mockShowLookupError,
      clearError: mockClearLookupError,
    });

    (useCurrentProfileQuery as ReturnType<typeof vi.fn>).mockReturnValue({
      data: null,
      isLoading: false,
    });

    (useMemberLookupState as ReturnType<typeof vi.fn>).mockReturnValue({
      matchedMember: null,
      isRegistrationBlocked: false,
      memberIdHighlight: false,
      reset: mockResetMemberLookup,
      lookupForm: {},
      isLookupPending: false,
      handleLookupSubmit: mockRunMemberLookupSubmit,
    });

    (useSubmitExcuseMutation as ReturnType<typeof vi.fn>).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
    });
  });

  it('initializes with step 1', () => {
    const { result } = renderHook(() => useLongLeaveRequestPageState(), { wrapper });
    expect(result.current.activeWizardStep).toBe(1);
    expect(result.current.isVerifyingSignedInMember).toBe(false);
  });

  it('handles lookup submit successfully and moves to step 2', async () => {
    mockRunMemberLookupSubmit.mockResolvedValueOnce({ success: true, data: {} });
    const { result } = renderHook(() => useLongLeaveRequestPageState(), { wrapper });

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: '123' });
    });

    expect(mockRunMemberLookupSubmit).toHaveBeenCalledWith({ memberId: '123' });
    expect(result.current.activeWizardStep).toBe(2);
  });

  it('handles lookup submit failure and shows error', async () => {
    mockRunMemberLookupSubmit.mockResolvedValueOnce({ success: false, error: 'Lookup Failed' });
    const { result } = renderHook(() => useLongLeaveRequestPageState(), { wrapper });

    await act(async () => {
      await result.current.handleLookupSubmit({ memberId: '123' });
    });

    expect(mockShowLookupError).toHaveBeenCalledWith('Lookup Failed');
    expect(result.current.activeWizardStep).toBe(1); // Stays on step 1
  });

  it('handles step navigation', () => {
    const { result } = renderHook(() => useLongLeaveRequestPageState(), { wrapper });

    act(() => {
      result.current.handleConfirmProfile();
    });
    expect(result.current.activeWizardStep).toBe(3);

    act(() => {
      result.current.handleBackToStepOne();
    });
    expect(mockResetMemberLookup).toHaveBeenCalled();
    expect(mockClearLookupError).toHaveBeenCalled();
    expect(result.current.activeWizardStep).toBe(1);
  });

  it('submits long leave request successfully', async () => {
    mockMutateAsync.mockResolvedValueOnce({});
    (useMemberLookupState as ReturnType<typeof vi.fn>).mockReturnValue({
      matchedMember: { member_token: 'token123' },
      handleLookupSubmit: mockRunMemberLookupSubmit,
      reset: mockResetMemberLookup,
    });

    const { result } = renderHook(() => useLongLeaveRequestPageState(), { wrapper });

    await act(async () => {
      await result.current.onSubmitLongLeave({
        start_date: '2023-10-01',
        end_date: '2023-10-29',
        reason: 'Vacation',
      });
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        start_date: '2023-10-01',
        end_date: '2023-10-29',
        is_long_leave: true,
        reason: 'Vacation',
        member_token: 'token123',
      }),
    );

    expect(result.current.isSubmissionConfirmed).toBe(true);
    expect(result.current.submissionResult).toEqual({
      start_date: '2023-10-01',
      end_date: '2023-10-29',
      reason: 'Vacation',
    });
    expect(toast.success).toHaveBeenCalledWith('Excuse request submitted successfully');
  });

  it('handles submission error', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));
    const { result } = renderHook(() => useLongLeaveRequestPageState(), { wrapper });

    await act(async () => {
      await result.current.onSubmitLongLeave({
        start_date: '2023-10-01',
        end_date: '2023-10-29',
        reason: 'Vacation',
      });
    });

    expect(result.current.submitErrorMessage).toBe('Network error');
    expect(result.current.isSubmissionConfirmed).toBe(false);
  });

  it('can reset the form state entirely', () => {
    const { result } = renderHook(() => useLongLeaveRequestPageState(), { wrapper });

    act(() => {
      result.current.handleResetForm();
    });

    expect(mockResetMemberLookup).toHaveBeenCalled();
    expect(mockClearLookupError).toHaveBeenCalled();
    expect(result.current.activeWizardStep).toBe(1);
    expect(result.current.submitErrorMessage).toBeNull();
    expect(result.current.isSubmissionConfirmed).toBe(false);
    expect(result.current.submissionResult).toBeNull();
  });
});

describe('longLeaveFormSchema validation', () => {
  it('validates a correct form data', () => {
    const validData = {
      start_date: '2023-10-01', // Sunday
      end_date: '2023-10-29', // Sunday, 28 days later
      reason: 'Extended break',
    };
    const result = longLeaveFormSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects start_date if not a Sunday', () => {
    const invalidData = {
      start_date: '2023-10-02', // Monday
      end_date: '2023-10-30',
      reason: 'Break',
    };
    const result = longLeaveFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Start date must be a Sunday');
    }
  });

  it('rejects end_date if gap is less than 4 weeks', () => {
    const invalidData = {
      start_date: '2023-10-01',
      end_date: '2023-10-15', // Only 2 weeks later
      reason: 'Break',
    };
    const result = longLeaveFormSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        'Long leave must span at least 4 weeks (28 days) from start date',
      );
    }
  });
});
