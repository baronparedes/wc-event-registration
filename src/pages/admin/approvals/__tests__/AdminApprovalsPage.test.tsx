import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApprovalRequest } from '@/lib/domain/approvals';

import { AdminApprovalsPage } from '../index';

const {
  mockUseApprovalRequestsQuery,
  mockUseSubmitApprovalDecisionMutation,
  mockUseSlodUsersQuery,
  mockUseDelegateApprovalMutation,
} = vi.hoisted(() => ({
  mockUseApprovalRequestsQuery: vi.fn(),
  mockUseSubmitApprovalDecisionMutation: vi.fn(),
  mockUseSlodUsersQuery: vi.fn(),
  mockUseDelegateApprovalMutation: vi.fn(),
}));

vi.mock('@/hooks/domain/approvals', () => ({
  useApprovalRequestsQuery: (params: unknown) => mockUseApprovalRequestsQuery(params),
  useSubmitApprovalDecisionMutation: () => mockUseSubmitApprovalDecisionMutation(),
  useSlodUsersQuery: () => mockUseSlodUsersQuery(),
  useDelegateApprovalMutation: () => mockUseDelegateApprovalMutation(),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => ({
    data: {
      adminRole: 'admin',
      isAuthenticated: true,
      session: null,
    },
    isLoading: false,
    error: null,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>,
  );
}

const mockRequests: ApprovalRequest[] = [
  {
    id: 'req-1',
    entity_type: 'form_submission',
    entity_id: 'sub-1',
    title: 'Camp Registration Submission',
    summary: 'Submitted for Summer Camp',
    requester_user_id: 'user-1',
    requester_name: 'John Doe',
    requester_email: 'john@example.com',
    metadata: {
      'Dietary Needs': 'Vegetarian',
    },
    status: 'pending',
    assigned_to_email: 'approver@example.com',
    assigned_to_user_id: null,
    decided_by_user_id: null,
    decided_by_email: null,
    decided_at: null,
    decision_notes: null,
    access_token: 'token-123',
    token_expires_at: '2026-11-01T00:00:00Z',
    token_used_at: null,
    created_at: '2026-10-18T10:00:00Z',
    updated_at: '2026-10-18T10:00:00Z',
  },
  {
    id: 'req-2',
    entity_type: 'service_excuse',
    entity_id: 'excuse-2',
    title: 'Long Leave Request',
    summary: 'Extended leave for sabbatical',
    requester_user_id: 'user-2',
    requester_name: 'Jane Smith',
    requester_email: 'jane@example.com',
    metadata: {
      start_date: '2026-11-01',
      end_date: '2026-11-29',
      reason: 'Sabbatical',
    },
    status: 'approved',
    assigned_to_email: null,
    assigned_to_user_id: null,
    decided_by_user_id: 'admin-1',
    decided_by_email: 'admin@example.com',
    decided_at: '2026-10-18T11:30:00Z',
    decision_notes: 'Approved by admin',
    access_token: 'token-456',
    token_expires_at: '2026-11-01T00:00:00Z',
    token_used_at: '2026-10-18T11:30:00Z',
    created_at: '2026-10-18T11:00:00Z',
    updated_at: '2026-10-18T11:30:00Z',
  },
];

describe('AdminApprovalsPage', () => {
  const mockSubmitDecision = vi.fn();
  const mockDelegateApproval = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSubmitApprovalDecisionMutation.mockReturnValue({
      mutate: mockSubmitDecision,
      isPending: false,
    });
    mockUseDelegateApprovalMutation.mockReturnValue({
      mutate: mockDelegateApproval,
      isPending: false,
    });
    mockUseSlodUsersQuery.mockReturnValue({
      data: [
        {
          auth_user_id: 'slod-1',
          email: 'slod1@example.com',
          name: 'SLOD Leader',
          avatar_object_key: null,
        },
      ],
      isLoading: false,
    });
  });

  it('renders loading skeletons when requests are loading', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithClient(<AdminApprovalsPage />);

    expect(screen.getByText('Approvals Inbox')).toBeInTheDocument();
  });

  it('renders approval requests list and metric cards', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: mockRequests,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithClient(<AdminApprovalsPage />);

    expect(screen.getByText('Camp Registration Submission')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Long Leave Request')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('opens review dialog when Review button is clicked with delegation section', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: mockRequests,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithClient(<AdminApprovalsPage />);

    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[0]);

    expect(screen.getByText(/Review request details/i)).toBeInTheDocument();
    expect(screen.getByText(/Dietary Needs/i)).toBeInTheDocument();
    expect(screen.getByText(/Delegate Review to SLOD/i)).toBeInTheDocument();
    expect(screen.getByText(/Assigned to/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve Request/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Decline$/i })).toBeInTheDocument();
  });

  it('allows admin to delegate review to an SLOD user', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: mockRequests,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithClient(<AdminApprovalsPage />);

    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[0]);

    const trigger = screen.getByLabelText(/Select SLOD Reviewer/i);
    fireEvent.click(trigger);

    const option = screen.getByRole('option', { name: /SLOD Leader/i });
    fireEvent.click(option);

    const delegateBtn = screen.getByRole('button', { name: /Assign & Notify/i });
    expect(delegateBtn).not.toBeDisabled();
    fireEvent.click(delegateBtn);

    expect(mockDelegateApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        approval_id: 'req-1',
        assigned_to_email: 'slod1@example.com',
        assigned_to_user_id: 'slod-1',
      }),
      expect.any(Object),
    );
  });

  it('allows admin to approve directly at any time', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: mockRequests,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithClient(<AdminApprovalsPage />);

    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[0]);

    const approveBtn = screen.getByRole('button', { name: /Approve Request/i });
    fireEvent.click(approveBtn);

    expect(mockSubmitDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        approval_id: 'req-1',
        decision: 'approved',
      }),
      expect.any(Object),
    );
  });
});
