import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { toast } from 'sonner';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApprovalReviewData } from '@/lib/domain/approvals';

import { ApprovalReviewPage } from '../[token]';

const { mockUseApprovalReviewQuery, mockUseSubmitApprovalDecisionMutation } = vi.hoisted(() => ({
  mockUseApprovalReviewQuery: vi.fn(),
  mockUseSubmitApprovalDecisionMutation: vi.fn(),
}));

vi.mock('@/hooks/domain/approvals', () => ({
  useApprovalReviewQuery: (token: string) => mockUseApprovalReviewQuery(token),
  useSubmitApprovalDecisionMutation: () => mockUseSubmitApprovalDecisionMutation(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithClient(token = 'token-123') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/approvals/review/${token}`]}>
        <Routes>
          <Route path="/approvals/review/:token" element={<ApprovalReviewPage />} />
          <Route path="/approvals/review" element={<ApprovalReviewPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const mockReviewData: ApprovalReviewData = {
  approval: {
    id: 'req-1',
    entity_type: 'form_submission',
    entity_id: 'sub-1',
    status: 'pending',
    title: 'Volunteer Application',
    summary: 'Submitted volunteer form',
    requester_name: 'Alex Johnson',
    requester_email: 'alex@example.com',
    requester_avatar_object_key: 'avatars/alex.jpg',
    assigned_to_email: 'approver@example.com',
    decided_at: null,
    decided_by_email: null,
    decision_notes: null,
    token_expires_at: '2026-11-01T00:00:00Z',
    is_expired: false,
    created_at: '2026-10-18T10:00:00Z',
    metadata: {},
  },
  entity_details: {
    form_title: 'Volunteer Ministry Sign-up',
    submitted_at: '2026-10-18T10:00:00Z',
    form_submission_answers: [
      {
        id: 'ans-1',
        answer_text: 'Audio / Tech',
        form_fields: { label: 'Preferred Team', field_type: 'text' },
      },
      {
        id: 'ans-2',
        answer_text: null,
        form_fields: undefined,
      },
    ],
  },
};

describe('ApprovalReviewPage', () => {
  const mockMutate = vi.fn();
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSubmitApprovalDecisionMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
  });

  it('renders loading skeleton when review data is loading', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();
    expect(screen.getAllByRole('presentation').length).toBeGreaterThan(0);
  });

  it('renders error state when token is invalid or request not found', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Invalid or expired approval token'),
      refetch: mockRefetch,
    });

    renderWithClient('invalid-token');
    expect(screen.getByText('Invalid or Expired Link')).toBeInTheDocument();
    expect(screen.getByText('Invalid or expired approval token')).toBeInTheDocument();
  });

  it('renders error state fallback message when error object has no message', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithClient('missing-approval');
    expect(screen.getByText('Invalid or Expired Link')).toBeInTheDocument();
    expect(
      screen.getByText(
        'This approval link is invalid, has expired, or the request no longer exists.',
      ),
    ).toBeInTheDocument();
  });

  it('renders review details, applicant info, and submission responses', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: mockReviewData,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    expect(screen.getByText('Volunteer Application')).toBeInTheDocument();
    expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('Preferred Team')).toBeInTheDocument();
    expect(screen.getByText('Audio / Tech')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument(); // fallback label
    expect(screen.getByText('—')).toBeInTheDocument(); // fallback answer
    expect(screen.getByRole('button', { name: /Approve Request/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decline Request/i })).toBeInTheDocument();
  });

  it('renders empty answers note when form answers are empty or null', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          requester_email: null,
        },
        entity_details: {
          form_submission_answers: [],
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();
    expect(screen.getByText('No field answers recorded.')).toBeInTheDocument();
    expect(screen.queryByText('alex@example.com')).not.toBeInTheDocument();
  });

  it('submits approval decision and handles onSuccess/onError callbacks', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: mockReviewData,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    const approveButton = screen.getByRole('button', { name: /Approve Request/i });
    fireEvent.click(approveButton);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-123',
        decision: 'approved',
        notes: null,
      }),
      expect.any(Object),
    );

    const callbacks = mockMutate.mock.calls[0][1] as {
      onSuccess: (data: { message?: string }) => void;
      onError: (err: { message?: string }) => void;
    };

    // Test onSuccess
    callbacks.onSuccess({ message: 'Approved successfully' });
    expect(toast.success).toHaveBeenCalledWith('Approved successfully');
    expect(mockRefetch).toHaveBeenCalled();

    // Test fallback success message
    callbacks.onSuccess({});
    expect(toast.success).toHaveBeenCalledWith('Request approved successfully');

    // Test onError
    callbacks.onError({ message: 'Submission failed' });
    expect(toast.error).toHaveBeenCalledWith('Submission failed');

    // Test fallback error message
    callbacks.onError({});
    expect(toast.error).toHaveBeenCalledWith('Failed to submit decision');
  });

  it('requires notes when declining and dispatches rejection with notes', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: mockReviewData,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    const declineButton = screen.getByRole('button', { name: /Decline Request/i });

    // Click without notes
    fireEvent.click(declineButton);
    expect(toast.error).toHaveBeenCalledWith(
      'Please provide a reason or note when declining a request.',
    );
    expect(mockMutate).not.toHaveBeenCalled();

    // Type notes and click decline
    const notesInput = screen.getByLabelText(/Notes \/ Feedback for Applicant/i);
    fireEvent.change(notesInput, { target: { value: 'Incomplete schedule details provided.' } });
    fireEvent.click(declineButton);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-123',
        decision: 'rejected',
        notes: 'Incomplete schedule details provided.',
      }),
      expect.any(Object),
    );
  });

  it('renders service excuse details with dates and reason', () => {
    const excuseData: ApprovalReviewData = {
      approval: {
        id: 'req-2',
        entity_type: 'service_excuse',
        entity_id: 'excuse-1',
        status: 'pending',
        title: 'Long Leave Request',
        summary: 'Filing for sabbatical',
        requester_name: 'Sarah Connor',
        requester_email: 'sarah@example.com',
        requester_avatar_object_key: null,
        assigned_to_email: null,
        decided_at: null,
        decided_by_email: null,
        decision_notes: null,
        token_expires_at: '2026-11-15T00:00:00Z',
        is_expired: false,
        created_at: '2026-10-18T10:00:00Z',
        metadata: {
          start_date: '2026-11-01',
          end_date: '2026-11-29',
          reason: 'Metadata sabbatical reason',
        },
      },
      entity_details: {
        start_date: '2026-11-01',
        end_date: '2026-11-29',
        reason: 'Sabbatical leave for four Sundays',
      },
    };

    mockUseApprovalReviewQuery.mockReturnValue({
      data: excuseData,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Long Leave Request' }),
    ).toBeInTheDocument();
    expect(screen.getByText('2026-11-01 to 2026-11-29')).toBeInTheDocument();
    expect(screen.getByText('All Sunday Service Commitments')).toBeInTheDocument();
    expect(screen.getByText('Sabbatical leave for four Sundays')).toBeInTheDocument();
  });

  it('falls back to metadata or default placeholder when excuse details are empty', () => {
    const excuseDataWithoutDetails: ApprovalReviewData = {
      approval: {
        id: 'req-2',
        entity_type: 'service_excuse',
        entity_id: 'excuse-1',
        status: 'pending',
        title: 'Long Leave Request',
        summary: 'Filing for sabbatical',
        requester_name: 'Sarah Connor',
        requester_email: 'sarah@example.com',
        requester_avatar_object_key: null,
        assigned_to_email: null,
        decided_at: null,
        decided_by_email: null,
        decision_notes: null,
        token_expires_at: '2026-11-15T00:00:00Z',
        is_expired: false,
        created_at: '2026-10-18T10:00:00Z',
        metadata: {},
      },
      entity_details: {},
    };

    mockUseApprovalReviewQuery.mockReturnValue({
      data: excuseDataWithoutDetails,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();
    expect(screen.getByText('— to —')).toBeInTheDocument();
    expect(screen.getByText('No reason provided.')).toBeInTheDocument();
  });

  it('renders already approved banner and hides action area', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          status: 'approved',
          decided_by_email: 'slod@example.com',
          decided_at: '2026-10-18T12:00:00Z',
          decision_notes: 'Approved after checking scheduling.',
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    expect(screen.getByText(/This request was approved by slod@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved after checking scheduling/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve Request/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Decline Request/i })).not.toBeInTheDocument();
  });

  it('renders already rejected banner and hides action area', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          status: 'rejected',
          decided_by_email: 'admin@example.com',
          decided_at: '2026-10-18T12:00:00Z',
          decision_notes: 'Declined due to conflict.',
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    expect(screen.getByText(/This request was rejected by admin@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Declined due to conflict/i)).toBeInTheDocument();
  });

  it('renders expired banner when status is pending and token is expired', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          status: 'pending',
          is_expired: true,
          token_expires_at: '2026-10-10T00:00:00Z',
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText(/This review link expired on/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve Request/i })).not.toBeInTheDocument();
  });

  it('renders disabled buttons when isSubmitting is true', () => {
    mockUseSubmitApprovalDecisionMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });
    mockUseApprovalReviewQuery.mockReturnValue({
      data: mockReviewData,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();
    expect(screen.getByRole('button', { name: /Approve Request/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Decline Request/i })).toBeDisabled();
  });

  it('renders required_approval field answers with status badge', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        entity_details: {
          id: 'sub-1',
          form_submission_answers: [
            {
              id: 'ans-1',
              answer_text: 'pending_approval',
              form_fields: {
                label: 'Ministry Approval',
                field_type: 'required_approval',
              },
            },
            {
              id: 'ans-2',
              answer_text: 'approved',
              form_fields: {
                label: 'Finance Approval',
                field_type: 'required_approval',
              },
            },
          ],
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    expect(screen.getByText('Ministry Approval')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Finance Approval')).toBeInTheDocument();
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
    expect(screen.queryByText('pending_approval')).not.toBeInTheDocument();
  });
});
