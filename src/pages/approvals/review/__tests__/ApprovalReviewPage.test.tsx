import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
    ],
  },
};

describe('ApprovalReviewPage', () => {
  const mockMutate = vi.fn();

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
      refetch: vi.fn(),
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
      refetch: vi.fn(),
    });

    renderWithClient('invalid-token');
    expect(screen.getByText('Invalid or Expired Link')).toBeInTheDocument();
    expect(screen.getByText('Invalid or expired approval token')).toBeInTheDocument();
  });

  it('renders review details, applicant info, and submission responses', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: mockReviewData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithClient();

    expect(screen.getByText('Volunteer Application')).toBeInTheDocument();
    expect(screen.getByText('Alex Johnson')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('Preferred Team')).toBeInTheDocument();
    expect(screen.getByText('Audio / Tech')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve Request/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Decline Request/i })).toBeInTheDocument();
  });

  it('submits approval decision when approved button is clicked', () => {
    mockUseApprovalReviewQuery.mockReturnValue({
      data: mockReviewData,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderWithClient();

    const approveButton = screen.getByRole('button', { name: /Approve Request/i });
    fireEvent.click(approveButton);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'token-123',
        decision: 'approved',
      }),
      expect.any(Object),
    );
  });
});
