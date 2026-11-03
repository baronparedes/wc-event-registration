import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getByRole('button', { name: /Continue to Decision/i })).toBeInTheDocument();

    // Advance to Step 2
    fireEvent.click(screen.getByRole('button', { name: /Continue to Decision/i }));
    expect(screen.getByRole('button', { name: /Approve Request/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decline Request/i })).toBeInTheDocument();

    // Navigate back to Step 1
    fireEvent.click(screen.getByRole('button', { name: /Back to Details/i }));
    expect(screen.getByRole('button', { name: /Continue to Decision/i })).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /Continue to Decision/i }));
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
    act(() => {
      callbacks.onSuccess({ message: 'Approved successfully' });
    });
    expect(toast.success).toHaveBeenCalledWith('Approved successfully');
    expect(mockRefetch).toHaveBeenCalled();

    // Test fallback success message
    act(() => {
      callbacks.onSuccess({});
    });
    expect(toast.success).toHaveBeenCalledWith('Request approved successfully');

    // Test onError
    act(() => {
      callbacks.onError({ message: 'Submission failed' });
    });
    expect(toast.error).toHaveBeenCalledWith('Submission failed');

    // Test fallback error message
    act(() => {
      callbacks.onError({});
    });
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

    fireEvent.click(screen.getByRole('button', { name: /Continue to Decision/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /Continue to Decision/i }));
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

  it('submits validated DGroup attestation answers with a recruitment endorsement decision', async () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          entity_type: 'recruitment_endorsement',
          title: 'DGroup Leader Endorsement',
        },
        entity_details: {
          id: '22222222-2222-4222-8222-222222222222',
          full_name: 'Test Taylor Member',
          nickname: 'Test Tay',
          desired_role: 'Usher',
          created_at: '2026-10-18T10:00:00Z',
          endorsement_questions: [
            {
              field_key: 'leader_attestation',
              label: 'How long have you known the applicant?',
              field_type: 'text',
              is_required: true,
              is_active: true,
              placeholder: 'Enter your response',
            },
          ],
          attestation_answers: {},
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    expect(screen.getAllByText('DGroup Leader Endorsement').length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText('Long Leave Request')).not.toBeInTheDocument();
    expect(screen.getByText('Test Taylor Member')).toBeInTheDocument();

    // Step 1: Advance to attestation
    fireEvent.click(screen.getByRole('button', { name: /Continue to Attestation/i }));

    // Step 2: Fill attestation input and proceed to decision
    fireEvent.change(screen.getByPlaceholderText('Enter your response'), {
      target: { value: 'I have known them for three years.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Decision/i }));

    // Step 3: Back to attestation and then re-continue
    expect(screen.getByRole('button', { name: 'Endorse Applicant' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Back to Attestation/i }));
    expect(screen.getByPlaceholderText('Enter your response')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue to Decision/i }));

    // Step 3: Submit Endorse
    fireEvent.click(screen.getByRole('button', { name: 'Endorse Applicant' }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'token-123',
          decision: 'approved',
          attestation_answers: { leader_attestation: 'I have known them for three years.' },
        }),
        expect.any(Object),
      );
    });
  });

  it('blocks advancing to Step 3 and shows validation error when required endorsement questions are unanswered', async () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          entity_type: 'recruitment_endorsement',
          title: 'DGroup Leader Endorsement',
        },
        entity_details: {
          id: '22222222-2222-4222-8222-222222222222',
          full_name: 'Test Taylor Member',
          nickname: 'Test Tay',
          desired_role: 'Usher',
          created_at: '2026-10-18T10:00:00Z',
          endorsement_questions: [
            {
              field_key: 'leader_attestation',
              label: 'How long have you known the applicant?',
              field_type: 'text',
              is_required: true,
              is_active: true,
              placeholder: 'Enter your response',
            },
          ],
          attestation_answers: {},
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Continue to Attestation/i }));

    // Try to continue without filling required field
    fireEvent.click(screen.getByRole('button', { name: /Continue to Decision/i }));

    // Should remain on Step 2 and show error
    expect(screen.queryByRole('button', { name: 'Endorse Applicant' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Continue to Decision/i })).toBeInTheDocument();
    expect(screen.getByText(/This field is required|Required/i)).toBeInTheDocument();
  });

  it('requires decision notes when declining recruitment endorsement on Step 3', async () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          entity_type: 'recruitment_endorsement',
          title: 'DGroup Leader Endorsement',
        },
        entity_details: {
          id: '22222222-2222-4222-8222-222222222222',
          full_name: 'Test Taylor Member',
          nickname: 'Test Tay',
          desired_role: 'Usher',
          created_at: '2026-10-18T10:00:00Z',
          endorsement_questions: [
            {
              field_key: 'leader_attestation',
              label: 'How long have you known the applicant?',
              field_type: 'text',
              is_required: false,
              is_active: true,
              placeholder: 'Enter your response',
            },
          ],
          attestation_answers: {},
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Continue to Attestation/i }));

    // Step 2 -> Step 3
    fireEvent.click(screen.getByRole('button', { name: /Continue to Decision/i }));

    // On Step 3, click Decline without notes
    const declineButton = screen.getByRole('button', { name: 'Decline' });
    fireEvent.click(declineButton);

    expect(toast.error).toHaveBeenCalledWith(
      'Please provide a reason or note when declining an applicant.',
    );
    expect(mockMutate).not.toHaveBeenCalled();

    // Fill notes and click Decline
    const notesInput = screen.getByLabelText(/Notes \/ Feedback for Applicant/i);
    fireEvent.change(notesInput, {
      target: { value: 'Applicant needs further spiritual grounding.' },
    });
    fireEvent.click(declineButton);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-123',
        decision: 'rejected',
        notes: 'Applicant needs further spiritual grounding.',
      }),
      expect.any(Object),
    );
  });

  it('renders read-only completed attestation answers for recruitment endorsement when already decided', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          entity_type: 'recruitment_endorsement',
          status: 'approved',
          title: 'DGroup Leader Endorsement',
          decided_by_email: 'leader@example.com',
          decided_at: '2026-10-19T10:00:00Z',
          decision_notes: 'Fully endorsed.',
        },
        entity_details: {
          id: '22222222-2222-4222-8222-222222222222',
          full_name: 'Test Taylor Member',
          nickname: 'Test Tay',
          desired_role: 'Usher',
          created_at: '2026-10-18T10:00:00Z',
          endorsement_questions: [
            {
              field_key: 'leader_full_name',
              label: 'What is your full name?',
              field_type: 'text',
              is_required: true,
              is_active: true,
            },
          ],
          attestation_answers: {
            leader_full_name: 'Pastor Robert',
          },
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    expect(
      screen.getByText(/This request was approved by leader@example.com/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Fully endorsed.')).toBeInTheDocument();
    expect(screen.getByText('Pastor Robert')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Endorse Applicant' })).not.toBeInTheDocument();
  });

  it('renders month-year picker for disciple tenure and normalizes to YYYY Mmm', async () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          entity_type: 'recruitment_endorsement',
          title: 'DGroup Leader Endorsement',
        },
        entity_details: {
          id: '22222222-2222-4222-8222-222222222222',
          full_name: 'Test Taylor Member',
          nickname: 'Test Tay',
          desired_role: 'Usher',
          created_at: '2026-10-18T10:00:00Z',
          endorsement_questions: [
            {
              field_key: 'disciple_dgroup_since',
              label: 'Please enter when your disciple started in your DGroup (YYYY MMM)',
              field_type: 'text',
              is_required: true,
              is_active: true,
              validation_rules: {
                pattern: '^\\d{4} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)$',
              },
            },
          ],
          attestation_answers: {},
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Continue to Attestation/i }));

    const monthInput = document.querySelector('input[type="month"]');
    expect(monthInput).toBeInTheDocument();

    fireEvent.change(monthInput!, { target: { value: '2025-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue to Decision/i }));

    // Advance to Step 3
    expect(screen.getByRole('button', { name: 'Endorse Applicant' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Endorse Applicant' }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'token-123',
          decision: 'approved',
          attestation_answers: { disciple_dgroup_since: '2025 Jan' },
        }),
        expect.any(Object),
      );
    });
  });

  it('renders leader attestation statement as Markdown in Step 2 and submits selection', async () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          entity_type: 'recruitment_endorsement',
          title: 'DGroup Leader Endorsement',
        },
        entity_details: {
          id: '22222222-2222-4222-8222-222222222222',
          full_name: 'Test Taylor Member',
          nickname: 'Test Tay',
          desired_role: 'Usher',
          created_at: '2026-10-18T10:00:00Z',
          endorsement_questions: [
            {
              field_key: 'leader_attestation_statement',
              label: 'The following statements are for your disciple.',
              field_type: 'radio',
              is_required: true,
              is_active: true,
              options: [
                { label: 'I attest', value: 'I attest' },
                { label: 'I DO NOT attest', value: 'I DO NOT attest' },
              ],
            },
          ],
          attestation_answers: {},
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Continue to Attestation/i }));

    // Verify Markdown content rendered
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'The following statements are for your disciple',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Is a committed member of my DGroup/i)).toBeInTheDocument();
    expect(screen.getByText(/Saved by grace through faith in Jesus/i)).toBeInTheDocument();
    expect(screen.getByText(/Knows by heart CCF’s mission and vision/i)).toBeInTheDocument();
    expect(
      screen.getByText(/I commit to supporting my disciple by regularly praying for/i),
    ).toBeInTheDocument();

    // Select "I attest"
    const radioAttest = screen.getByRole('radio', { name: /I attest/i });
    expect(radioAttest).toBeInTheDocument();
    fireEvent.click(radioAttest);

    // Continue to Step 3
    fireEvent.click(screen.getByRole('button', { name: /Continue to Decision/i }));

    expect(screen.getByRole('button', { name: 'Endorse Applicant' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Endorse Applicant' }));

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'token-123',
          decision: 'approved',
          attestation_answers: { leader_attestation_statement: 'I attest' },
        }),
        expect.any(Object),
      );
    });
  });

  it('renders leader attestation statement as Markdown in read-only completed view', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          entity_type: 'recruitment_endorsement',
          status: 'approved',
          title: 'DGroup Leader Endorsement',
          decided_by_email: 'leader@example.com',
          decided_at: '2026-10-19T10:00:00Z',
          decision_notes: 'Highly recommended.',
        },
        entity_details: {
          id: '22222222-2222-4222-8222-222222222222',
          full_name: 'Test Taylor Member',
          nickname: 'Test Tay',
          desired_role: 'Usher',
          created_at: '2026-10-18T10:00:00Z',
          endorsement_questions: [
            {
              field_key: 'leader_attestation_statement',
              label: 'The following statements are for your disciple.',
              field_type: 'radio',
              is_required: true,
              is_active: true,
              options: [
                { label: 'I attest', value: 'I attest' },
                { label: 'I DO NOT attest', value: 'I DO NOT attest' },
              ],
            },
          ],
          attestation_answers: {
            leader_attestation_statement: 'I attest',
          },
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'The following statements are for your disciple',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Is a committed member of my DGroup/i)).toBeInTheDocument();
    expect(screen.getByText(/Leader Attestation Commitment:/i)).toBeInTheDocument();
    expect(screen.getByText('I attest')).toBeInTheDocument();
  });

  it('renders rating scale legend for scores and renders stars without of 3 text', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: {
        ...mockReviewData,
        approval: {
          ...mockReviewData.approval,
          entity_type: 'recruitment_endorsement',
          title: 'DGroup Leader Endorsement',
        },
        entity_details: {
          id: '22222222-2222-4222-8222-222222222222',
          full_name: 'Test Taylor Member',
          nickname: 'Test Tay',
          desired_role: 'Usher',
          created_at: '2026-10-18T10:00:00Z',
          endorsement_questions: [
            {
              field_key: 'eval_prayer_and_devotion',
              label: 'Has consistent prayer time, personal devotion and study of Gods word',
              field_type: 'rating',
              is_required: true,
              is_active: true,
              validation_rules: { min: 1, max: 3 },
            },
          ],
          attestation_answers: {
            eval_prayer_and_devotion: 3,
          },
        },
      },
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    });

    renderWithClient();

    // Step 1 -> Step 2
    fireEvent.click(screen.getByRole('button', { name: /Continue to Attestation/i }));

    // Legend is present
    expect(screen.getByText(/Rating Scale Legend \(Scores 1 to 3\):/i)).toBeInTheDocument();
    expect(screen.getByText('Not Observed')).toBeInTheDocument();
    expect(screen.getByText('Observed Some of the time')).toBeInTheDocument();
    expect(screen.getByText('Observed Most of the time')).toBeInTheDocument();

    // Stars rendered without "of 3" text
    expect(screen.queryByText(/of 3/i)).not.toBeInTheDocument();
  });
});
