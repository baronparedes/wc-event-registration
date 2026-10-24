import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberFormSubmissionItem } from '@/lib/domain/forms';

import { FormSubmissionsTab } from '../FormSubmissionsTab';

const { mockUseMemberFormSubmissionsQuery } = vi.hoisted(() => ({
  mockUseMemberFormSubmissionsQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/forms', () => ({
  useMemberFormSubmissionsQuery: (memberId?: string) => mockUseMemberFormSubmissionsQuery(memberId),
}));

describe('FormSubmissionsTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseMemberFormSubmissionsQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(<FormSubmissionsTab memberId="user-123" />);

    expect(screen.getByText('Loading form submissions...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    mockUseMemberFormSubmissionsQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
    });

    render(<FormSubmissionsTab memberId="user-123" />);

    expect(screen.getByText('Failed to load form submissions.')).toBeInTheDocument();
  });

  it('renders empty state when no submissions exist', () => {
    mockUseMemberFormSubmissionsQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });

    render(<FormSubmissionsTab memberId="user-123" />);

    expect(screen.getByText('No form submissions found.')).toBeInTheDocument();
    expect(screen.getByText('Form Submissions (0)')).toBeInTheDocument();
  });

  it('renders list of submissions with status and opens details modal on click', () => {
    const mockSubmission: MemberFormSubmissionItem = {
      submission_id: 'sub-xyz',
      form_id: 'form-123',
      form_title: 'Ministry Leader Application',
      form_slug: 'ministry-leader-application',
      form_description: 'Application for leaders',
      status: 'pending_approval',
      submitted_at: '2026-10-24T10:00:00Z',
      updated_at: '2026-10-24T10:00:00Z',
      answers: [
        {
          id: 'ans-1',
          form_field_id: 'f-1',
          field_key: 'reason',
          label: 'Why do you want to join?',
          field_type: 'textarea',
          answer_text: 'To serve with passion',
          answer_number: null,
        },
        {
          id: 'ans-2',
          form_field_id: 'f-2',
          field_key: 'pastor_endorsement',
          label: 'Pastor Endorsement',
          field_type: 'required_approval',
          answer_text: 'pending_approval',
          answer_number: null,
        },
      ],
      approval_requests: [
        {
          id: 'req-1',
          status: 'pending',
          assigned_to_email: 'pastor@example.com',
          decided_by_email: null,
          decided_at: null,
          decision_notes: null,
          field_label: 'Pastor Endorsement',
          field_key: 'pastor_endorsement',
        },
      ],
    };

    mockUseMemberFormSubmissionsQuery.mockReturnValue({
      data: [mockSubmission],
      isLoading: false,
      isError: false,
    });

    render(<FormSubmissionsTab memberId="user-123" />);

    expect(screen.getByText('Form Submissions (1)')).toBeInTheDocument();
    expect(screen.getByText('Ministry Leader Application')).toBeInTheDocument();
    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    expect(screen.getByText('0/1 Approvals')).toBeInTheDocument();

    // Click row to open modal
    fireEvent.click(
      screen.getByRole('button', { name: /View Ministry Leader Application submission details/i }),
    );

    // Modal should now be open
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Pastor Endorsement')).toBeInTheDocument();
    expect(screen.getByText('pastor@example.com')).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.getByText('Why do you want to join?')).toBeInTheDocument();
    expect(screen.getByText('To serve with passion')).toBeInTheDocument();
    expect(screen.queryByText('pending_approval')).not.toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
