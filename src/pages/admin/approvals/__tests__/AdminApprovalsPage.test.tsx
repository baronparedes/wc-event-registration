import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { toast } from 'sonner';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApprovalRequest } from '@/lib/domain/approvals';

import { AdminApprovalsPage } from '../index';

const {
  mockUseApprovalRequestsQuery,
  mockUseSubmitApprovalDecisionMutation,
  mockUseSlodUsersQuery,
  mockUseDelegateApprovalMutation,
  mockUseIsMobileViewport,
} = vi.hoisted(() => ({
  mockUseApprovalRequestsQuery: vi.fn(),
  mockUseSubmitApprovalDecisionMutation: vi.fn(),
  mockUseSlodUsersQuery: vi.fn(),
  mockUseDelegateApprovalMutation: vi.fn(),
  mockUseIsMobileViewport: vi.fn(() => false),
}));

vi.mock('@/hooks/domain/approvals', () => ({
  useApprovalRequestsQuery: (params: unknown) => mockUseApprovalRequestsQuery(params),
  useSubmitApprovalDecisionMutation: () => mockUseSubmitApprovalDecisionMutation(),
  useSlodUsersQuery: () => mockUseSlodUsersQuery(),
  useDelegateApprovalMutation: () => mockUseDelegateApprovalMutation(),
}));

vi.mock('@/hooks/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/utils')>();
  return {
    ...actual,
    useIsMobileViewport: () => mockUseIsMobileViewport(),
  };
});

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => ({
    data: {
      adminRole: 'admin',
      isAuthenticated: true,
      session: null,
    },
    can: () => true,
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
      EmergencyContact: { name: 'Mary Doe', phone: '09171234567' },
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
  {
    id: 'req-3',
    entity_type: 'service_excuse',
    entity_id: 'excuse-3',
    title: 'Short Notice Leave',
    summary: 'Late filing for personal reasons',
    requester_user_id: 'user-3',
    requester_name: 'Bob Miller',
    requester_email: null,
    metadata: {
      reason: 'Personal emergency',
    },
    status: 'rejected',
    assigned_to_email: null,
    assigned_to_user_id: null,
    decided_by_user_id: null,
    decided_by_email: null,
    decided_at: '2026-10-18T12:00:00Z',
    decision_notes: 'Declined due to short notice',
    access_token: 'token-789',
    token_expires_at: '2026-11-01T00:00:00Z',
    token_used_at: '2026-10-18T12:00:00Z',
    created_at: '2026-10-18T11:45:00Z',
    updated_at: '2026-10-18T12:00:00Z',
  },
];

describe('AdminApprovalsPage', () => {
  const mockSubmitDecision = vi.fn();
  const mockDelegateApproval = vi.fn();
  const mockRefetch = vi.fn();

  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseIsMobileViewport.mockReturnValue(false);
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
        {
          auth_user_id: 'slod-2',
          email: 'slod2@example.com',
          name: 'SLOD Assistant',
          avatar_object_key: null,
        },
      ],
      isLoading: false,
    });
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: mockRequests,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });
  });

  it('renders loading skeletons when requests are loading', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: [],
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient(<AdminApprovalsPage />);

    expect(screen.getByText('Approvals Inbox')).toBeInTheDocument();
  });

  it('renders error banner when loading requests fails', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
      error: new Error('Failed to load approval requests.'),
      refetch: mockRefetch,
    });

    renderWithClient(<AdminApprovalsPage />);

    expect(screen.getByText('Failed to load approval requests.')).toBeInTheDocument();
  });

  it('renders empty state when no requests match', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient(<AdminApprovalsPage />);

    expect(screen.getByText('No approval requests found')).toBeInTheDocument();
  });

  it('renders approval requests list and metric cards with all statuses', () => {
    renderWithClient(<AdminApprovalsPage />);

    const allBtn = screen.getByRole('button', { name: /^All$/i });
    fireEvent.click(allBtn);

    expect(screen.getByText('Camp Registration Submission')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Long Leave Request')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Short Notice Leave')).toBeInTheDocument();
    expect(screen.getByText('Bob Miller')).toBeInTheDocument();
  });

  it('allows switching status filters via ButtonGroup', () => {
    renderWithClient(<AdminApprovalsPage />);

    const approvedBtn = screen.getByRole('button', { name: /^Approved$/i });
    fireEvent.click(approvedBtn);

    const declinedBtn = screen.getByRole('button', { name: /^Declined$/i });
    fireEvent.click(declinedBtn);

    const allBtn = screen.getByRole('button', { name: /^All$/i });
    fireEvent.click(allBtn);

    const pendingBtn = screen.getByRole('button', { name: /^Pending$/i });
    fireEvent.click(pendingBtn);
  });

  it('allows filtering by request entity type and searching', () => {
    renderWithClient(<AdminApprovalsPage />);

    const selectTrigger = screen.getByLabelText(/Request Type/i);
    fireEvent.click(selectTrigger);

    const formOption = screen.getByRole('option', { name: /Form Registrations/i });
    fireEvent.click(formOption);

    const searchInput = screen.getByPlaceholderText(/Search requester or title/i);
    fireEvent.change(searchInput, { target: { value: 'Summer' } });
    expect(searchInput).toHaveValue('Summer');

    const clearBtn = screen.getByLabelText(/Clear search/i);
    fireEvent.click(clearBtn);
    expect(searchInput).toHaveValue('');
  });

  it('opens review dialog when Review button is clicked with delegation section', () => {
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

  it('allows admin to delegate review to an SLOD user with callbacks', () => {
    mockDelegateApproval.mockImplementation(
      (_payload: unknown, options?: { onSuccess?: () => void; onError?: (err: Error) => void }) => {
        options?.onSuccess?.();
      },
    );

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
    expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('Review delegated to'));

    // Test delegation error callback
    mockDelegateApproval.mockImplementation(
      (_payload: unknown, options?: { onError?: (err: Error) => void }) => {
        options?.onError?.(new Error('Network error during delegation'));
      },
    );
    const trigger2 = screen.getByLabelText(/Select SLOD Reviewer/i);
    fireEvent.click(trigger2);
    const option2 = screen.getByRole('option', { name: /SLOD Assistant/i });
    fireEvent.click(option2);
    fireEvent.click(delegateBtn);
    expect(toast.error).toHaveBeenCalledWith('Network error during delegation');
  });

  it('allows admin to approve directly at any time with callbacks', () => {
    mockSubmitDecision.mockImplementation(
      (
        _payload: unknown,
        options?: {
          onSuccess?: (data: { message?: string }) => void;
          onError?: (err: Error) => void;
        },
      ) => {
        options?.onSuccess?.({ message: 'Request approved successfully' });
      },
    );

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
    expect(toast.success).toHaveBeenCalledWith('Request approved successfully');
    expect(mockRefetch).toHaveBeenCalled();

    // Test decision error callback
    fireEvent.click(reviewButtons[0]);
    mockSubmitDecision.mockImplementation(
      (_payload: unknown, options?: { onError?: (err: Error) => void }) => {
        options?.onError?.(new Error('Decision submission failed'));
      },
    );
    const approveBtn2 = screen.getByRole('button', { name: /Approve Request/i });
    fireEvent.click(approveBtn2);
    expect(toast.error).toHaveBeenCalledWith('Decision submission failed');
  });

  it('requires notes when declining and submits rejection once note is provided', () => {
    mockSubmitDecision.mockImplementation(
      (_payload: unknown, options?: { onSuccess?: (data: { message?: string }) => void }) => {
        options?.onSuccess?.({});
      },
    );

    renderWithClient(<AdminApprovalsPage />);

    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[0]);

    // Decline without note
    const declineBtn = screen.getByRole('button', { name: /^Decline$/i });
    fireEvent.click(declineBtn);

    expect(toast.error).toHaveBeenCalledWith(
      'Please enter a note explaining why this request is being declined.',
    );
    expect(mockSubmitDecision).not.toHaveBeenCalled();

    // Fill in note and decline
    const notesInput = screen.getByLabelText(/Decision Notes/i);
    fireEvent.change(notesInput, { target: { value: 'Incomplete prerequisite form' } });
    fireEvent.click(declineBtn);

    expect(mockSubmitDecision).toHaveBeenCalledWith(
      expect.objectContaining({
        approval_id: 'req-1',
        decision: 'rejected',
        notes: 'Incomplete prerequisite form',
      }),
      expect.any(Object),
    );
  });

  it('inspects an already approved request to view decision details', () => {
    renderWithClient(<AdminApprovalsPage />);

    const allBtn = screen.getByRole('button', { name: /^All$/i });
    fireEvent.click(allBtn);

    const detailsButtons = screen.getAllByRole('button', { name: /^Details$/i });
    fireEvent.click(detailsButtons[0]); // approved request req-2

    expect(screen.getByText('Decision Record')).toBeInTheDocument();
    expect(screen.getByText(/Decided by admin@example.com/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved by admin/i)).toBeInTheDocument();

    const closeBtn = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeBtn);
  });

  it('inspects a rejected request to view rejected details and fallback Decided by Administrator', () => {
    renderWithClient(<AdminApprovalsPage />);

    const allBtn = screen.getByRole('button', { name: /^All$/i });
    fireEvent.click(allBtn);

    const detailsButtons = screen.getAllByRole('button', { name: /^Details$/i });
    fireEvent.click(detailsButtons[1]); // rejected request req-3

    expect(screen.getByText('Decision Record')).toBeInTheDocument();
    expect(screen.getByText(/Decided by Administrator/i)).toBeInTheDocument();
    expect(screen.getByText(/Declined due to short notice/i)).toBeInTheDocument();
  });

  it('renders mobile card layout and triggers review when in mobile viewport', () => {
    mockUseIsMobileViewport.mockReturnValue(true);

    renderWithClient(<AdminApprovalsPage />);

    expect(screen.getByText('Camp Registration Submission')).toBeInTheDocument();
    const mobileReviewButtons = screen.getAllByRole('button', { name: /Review & Decide/i });
    expect(mobileReviewButtons.length).toBeGreaterThan(0);

    fireEvent.click(mobileReviewButtons[0]);
    expect(screen.getByText(/Review request details/i)).toBeInTheDocument();
  });

  it('renders Endorsement badge and handles Endorsements entity filter', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: [
        {
          id: 'req-endorsement',
          entity_type: 'recruitment_endorsement',
          entity_id: 'app-1',
          status: 'pending',
          title: 'Welcome Center endorsement for Bryan Daniel G Paredes',
          summary: 'Please review volunteer application.',
          requester_user_id: 'user-1',
          requester_name: 'Bryan Daniel G Paredes',
          requester_email: 'bryan@example.com',
          requester_avatar_object_key: null,
          assigned_to_email: null,
          assigned_to_user_id: null,
          decided_by_user_id: null,
          decided_by_email: null,
          decided_at: null,
          decision_notes: null,
          access_token: 'token-endorsement',
          token_expires_at: '2026-11-20T00:00:00Z',
          token_used_at: null,
          metadata: {},
          created_at: '2026-11-03T10:00:00Z',
          updated_at: '2026-11-03T10:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithClient(<AdminApprovalsPage />);

    expect(screen.getByText('Endorsement')).toBeInTheDocument();
    expect(
      screen.getByText('Welcome Center endorsement for Bryan Daniel G Paredes'),
    ).toBeInTheDocument();

    const selectTrigger = screen.getByLabelText(/Request Type/i);
    fireEvent.click(selectTrigger);

    const endorsementOption = screen.getByRole('option', { name: /^Endorsements$/i });
    fireEvent.click(endorsementOption);

    expect(mockUseApprovalRequestsQuery).toHaveBeenCalledWith(
      expect.objectContaining({ entity_type: 'recruitment_endorsement' }),
    );
  });

  it('inspects an endorsement request to view the 5 grouped questionnaire sections', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: [
        {
          id: 'req-endorsement-details',
          entity_type: 'recruitment_endorsement',
          entity_id: 'app-1',
          status: 'pending',
          title: 'Welcome Center endorsement for Bryan Daniel G Paredes',
          summary: 'Please review volunteer application.',
          requester_user_id: 'user-1',
          requester_name: 'Bryan Daniel G Paredes',
          requester_email: 'bryan@example.com',
          requester_avatar_object_key: null,
          assigned_to_email: null,
          assigned_to_user_id: null,
          decided_by_user_id: null,
          decided_by_email: null,
          decided_at: null,
          decision_notes: null,
          access_token: 'token-endorsement',
          token_expires_at: '2026-11-20T00:00:00Z',
          token_used_at: null,
          metadata: {
            application_id: 'fcb9479b-1335-46c0-989c-885ff09d51a4',
            attestation_answers: {
              leader_full_name: 'Baron Paredes',
              disciple_dgroup_since: '2024 Oct',
              is_disciple_dgroup_leader: 'No',
              eval_prayer_and_devotion: 3,
              eval_no_gossip: 3,
              disciple_strengths: 'Consistent prayer warrior',
              recommendation_decision: 'Yes',
              leader_attestation_statement: 'I attest',
            },
          },
          created_at: '2026-11-03T10:00:00Z',
          updated_at: '2026-11-03T10:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithClient(<AdminApprovalsPage />);

    const reviewButton = screen.getByRole('button', { name: /Review & Decide/i });
    fireEvent.click(reviewButton);

    // Verify 5 grouped sections header and content
    expect(screen.getByText('DGroup Leader Endorsement Questionnaire')).toBeInTheDocument();
    expect(screen.getByText('1. Leader & DGroup Relationship')).toBeInTheDocument();
    expect(screen.getByText('Baron Paredes')).toBeInTheDocument();
    expect(screen.getByText('2. Spiritual Maturity & Character Evaluation')).toBeInTheDocument();
    expect(screen.getByText(/Consistent prayer warrior/i)).toBeInTheDocument();
    expect(screen.getByText('I attest')).toBeInTheDocument();
  });

  it('inspects a long leave request to view grouped schedule, duration, services, and reason', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: [
        {
          id: 'req-long-leave-grouped',
          entity_type: 'service_excuse',
          entity_id: 'excuse-10',
          status: 'pending',
          title: 'Long Leave Request',
          summary: 'Leave from 2026-10-25 to 2026-11-29 (9AM, 12NN, 3PM)',
          requester_user_id: 'user-10',
          requester_name: 'Josepina Ramirez',
          requester_email: 'jjay.ramirez27@example.com',
          requester_avatar_object_key: null,
          assigned_to_email: null,
          assigned_to_user_id: null,
          decided_by_user_id: null,
          decided_by_email: null,
          decided_at: null,
          decision_notes: null,
          access_token: 'token-long-leave',
          token_expires_at: '2026-11-20T00:00:00Z',
          token_used_at: null,
          metadata: {
            start_date: '2026-10-25',
            end_date: '2026-11-29',
            services: ['9AM', '12NN', '3PM'],
            reason: 'Trip to US to attend to her sick mother.',
          },
          created_at: '2026-10-20T10:00:00Z',
          updated_at: '2026-10-20T10:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithClient(<AdminApprovalsPage />);

    const reviewButton = screen.getByRole('button', { name: /Review & Decide/i });
    fireEvent.click(reviewButton);

    // Verify grouped Long Leave headers and content
    expect(screen.getByText('Volunteer Long Leave Details')).toBeInTheDocument();
    expect(screen.getByText('Leave Schedule & Services')).toBeInTheDocument();
    expect(screen.getByText('Reason for Leave')).toBeInTheDocument();

    // Verify schedule details & duration
    expect(screen.getByText('Start Date (Sunday)')).toBeInTheDocument();
    expect(screen.getByText('(2026-10-25)')).toBeInTheDocument();
    expect(screen.getByText('End Date (Sunday)')).toBeInTheDocument();
    expect(screen.getByText('(2026-11-29)')).toBeInTheDocument();
    expect(screen.getByText('6 Sundays')).toBeInTheDocument();
    expect(screen.getByText('(36 days)')).toBeInTheDocument();

    // Verify services rendered as badges rather than raw key-values (no "0:", "1:", "2:")
    expect(screen.getByText('9AM')).toBeInTheDocument();
    expect(screen.getByText('12NN')).toBeInTheDocument();
    expect(screen.getByText('3PM')).toBeInTheDocument();
    expect(screen.queryByText('0:')).not.toBeInTheDocument();

    // Verify reason rendered cleanly
    expect(screen.getByText('Trip to US to attend to her sick mother.')).toBeInTheDocument();
  });

  it('inspects a form registration request to view grouped form target and submission responses', () => {
    mockUseApprovalRequestsQuery.mockReturnValue({
      data: [
        {
          id: 'req-form-grouped',
          entity_type: 'form_submission',
          entity_id: 'sub-20',
          status: 'pending',
          title: 'Youth Summer Camp – Pastoral Sign-off',
          summary: 'Pastoral Sign-off for Youth Summer Camp by John Doe',
          requester_user_id: 'user-20',
          requester_name: 'John Doe',
          requester_email: 'john.doe@example.com',
          requester_avatar_object_key: null,
          assigned_to_email: null,
          assigned_to_user_id: null,
          decided_by_user_id: null,
          decided_by_email: null,
          decided_at: null,
          decision_notes: null,
          access_token: 'token-form',
          token_expires_at: '2026-11-20T00:00:00Z',
          token_used_at: null,
          metadata: {
            form_slug: 'youth-summer-camp-2026',
            field_label: 'Pastoral Sign-off',
            responses: {
              cabin_preference: 'Cabin Alpha',
              tshirt_size: 'L',
            },
            dietary_restrictions: 'Vegetarian',
            emergency_contact: {
              name: 'Jane Doe',
              phone: '09171234567',
            },
          },
          created_at: '2026-10-22T10:00:00Z',
          updated_at: '2026-10-22T10:00:00Z',
        },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetch,
    });

    renderWithClient(<AdminApprovalsPage />);

    const reviewButton = screen.getByRole('button', { name: /Review & Decide/i });
    fireEvent.click(reviewButton);

    // Verify grouped Form Registration headers and content
    expect(screen.getByText('Form Registration Details')).toBeInTheDocument();
    expect(screen.getByText('Form & Sign-off Target')).toBeInTheDocument();
    expect(screen.getByText('Submission Responses')).toBeInTheDocument();

    // Verify form target items
    expect(screen.getByText('Pastoral Sign-off')).toBeInTheDocument();
    expect(screen.getByText('youth-summer-camp-2026')).toBeInTheDocument();
    expect(screen.getAllByText('Pastoral Sign-off for Youth Summer Camp by John Doe')).toHaveLength(
      2,
    );

    // Verify submission responses (unpacked from responses and flat keys)
    expect(screen.getByText('Cabin Preference:')).toBeInTheDocument();
    expect(screen.getByText('Cabin Alpha')).toBeInTheDocument();
    expect(screen.getByText('Tshirt Size:')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument();
    expect(screen.getByText('Dietary Restrictions:')).toBeInTheDocument();
    expect(screen.getByText('Vegetarian')).toBeInTheDocument();
    expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});
