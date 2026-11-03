import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ApprovalRequest } from '@/lib/domain/approvals';

import {
  ApprovalFiltersToolbar,
  ApprovalInspectDialog,
  ApprovalMetricsCards,
  ApprovalReviewerDelegationSection,
  ApprovalsMobileList,
  ApprovalsTable,
  FormRegistrationInspectSection,
  LongLeaveInspectSection,
  RecruitmentEndorsementInspectSection,
} from '../index';

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const baseRequest: ApprovalRequest = {
  id: 'req-1',
  entity_type: 'service_excuse',
  entity_id: 'se-1',
  title: 'Long Leave Request',
  summary: 'Medical leave',
  requester_user_id: 'user-1',
  requester_name: 'Test Requester',
  requester_email: 'test.requester@example.com',
  metadata: {
    start_date: '2026-10-25',
    end_date: '2026-11-29',
    services: '9AM, 12NN',
    reason: 'Family matter',
    hospital_name: 'Test Hospital',
  },
  status: 'pending',
  assigned_to_email: 'slod@example.com',
  assigned_to_user_id: null,
  decided_by_user_id: null,
  decided_by_email: null,
  decided_at: null,
  decision_notes: null,
  access_token: 'tok-1',
  token_expires_at: '2026-12-01T00:00:00Z',
  token_used_at: null,
  created_at: '2026-10-24T10:00:00Z',
  updated_at: '2026-10-24T10:00:00Z',
};

describe('Approval Sub-components', () => {
  describe('ApprovalMetricsCards', () => {
    it('renders metrics cards with correct counts', () => {
      render(<ApprovalMetricsCards metrics={{ total: 9, pending: 3, approved: 5, rejected: 1 }} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('ApprovalFiltersToolbar', () => {
    it('handles filter switches and search input', () => {
      const onStatusChange = vi.fn();
      const onEntityChange = vi.fn();
      const onSearchChange = vi.fn();
      const onSearchClear = vi.fn();

      render(
        <ApprovalFiltersToolbar
          selectedStatus="pending"
          onStatusChange={onStatusChange}
          selectedEntity="all"
          onEntityChange={onEntityChange}
          searchQuery=""
          onSearchChange={onSearchChange}
          onSearchClear={onSearchClear}
        />,
      );

      const approvedTab = screen.getByRole('button', { name: /Approved/i });
      fireEvent.click(approvedTab);
      expect(onStatusChange).toHaveBeenCalledWith('approved');
    });
  });

  describe('ApprovalsTable', () => {
    it('handles clicking the row and stopping propagation on actions', () => {
      const onInspect = vi.fn();
      const requests: ApprovalRequest[] = [
        { ...baseRequest, id: 'req-pending', status: 'pending' },
        { ...baseRequest, id: 'req-approved', status: 'approved' },
        { ...baseRequest, id: 'req-rejected', status: 'rejected' },
      ];

      renderWithClient(<ApprovalsTable requests={requests} onInspect={onInspect} />);

      // Clicking row triggers onInspect
      const rows = screen.getAllByRole('row');
      // rows[0] is header, rows[1] is first data row
      fireEvent.click(rows[1]);
      expect(onInspect).toHaveBeenCalledWith(requests[0]);

      // Clicking the action button triggers onInspect
      const detailsButtons = screen.getAllByRole('button', { name: /Details/i });
      fireEvent.click(detailsButtons[0]);
      expect(onInspect).toHaveBeenCalledWith(requests[1]);
    });
  });

  describe('ApprovalsMobileList', () => {
    it('renders all status variants and handles view details button click', () => {
      const onInspect = vi.fn();
      const requests: ApprovalRequest[] = [
        { ...baseRequest, id: 'req-approved', status: 'approved' },
        { ...baseRequest, id: 'req-rejected', status: 'rejected' },
        { ...baseRequest, id: 'req-pending', status: 'pending' },
      ];

      renderWithClient(<ApprovalsMobileList requests={requests} onInspect={onInspect} />);

      expect(screen.getByText('approved')).toBeInTheDocument();
      expect(screen.getByText('rejected')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();

      const viewDetailsButtons = screen.getAllByRole('button', { name: /View Details/i });
      expect(viewDetailsButtons).toHaveLength(2);
      fireEvent.click(viewDetailsButtons[0]);
      expect(onInspect).toHaveBeenCalledWith(requests[0]);

      const reviewButton = screen.getByRole('button', { name: /Review & Decide/i });
      fireEvent.click(reviewButton);
      expect(onInspect).toHaveBeenCalledWith(requests[2]);
    });
  });

  describe('ApprovalReviewerDelegationSection', () => {
    it('displays Delegating... state when isDelegating is true', () => {
      render(
        <ApprovalReviewerDelegationSection
          request={baseRequest}
          delegatedEmail="newslod@example.com"
          onDelegatedEmailChange={vi.fn()}
          onDelegate={vi.fn()}
          isDelegating={true}
          slodUsers={[
            {
              auth_user_id: 's1',
              email: 'newslod@example.com',
              name: 'Test SLOD',
              avatar_object_key: null,
            },
          ]}
          isLoadingSlod={false}
        />,
      );

      expect(screen.getByRole('button', { name: /Delegating\.\.\./i })).toBeDisabled();
    });
  });

  describe('RecruitmentEndorsementInspectSection', () => {
    it('renders unmapped additional observations when present', () => {
      const attestationAnswers = {
        eval_prayer_and_devotion: 3,
        custom_passion: 'Worship and prayer',
        custom_metadata_obj: { key: 'val' },
      };

      render(<RecruitmentEndorsementInspectSection attestationAnswers={attestationAnswers} />);

      expect(screen.getByText('Additional Observations')).toBeInTheDocument();
      expect(screen.getByText('custom passion')).toBeInTheDocument();
      expect(screen.getByText('Worship and prayer')).toBeInTheDocument();
      expect(screen.getByText('{"key":"val"}')).toBeInTheDocument();
    });
  });

  describe('LongLeaveInspectSection', () => {
    it('renders fallback for missing reason and displays extra unmapped fields', () => {
      const request: ApprovalRequest = {
        ...baseRequest,
        summary: '',
        metadata: {
          start_date: '2026-10-25',
          end_date: '2026-11-29',
          services: ['9AM'],
          flight_number: 'PR102',
        },
      };

      render(<LongLeaveInspectSection request={request} />);

      expect(screen.getByText('No reason provided.')).toBeInTheDocument();
      expect(screen.getByText('Additional Information')).toBeInTheDocument();
      expect(screen.getByText('flight number')).toBeInTheDocument();
      expect(screen.getByText('PR102')).toBeInTheDocument();
    });
  });

  describe('FormRegistrationInspectSection', () => {
    it('handles 1 answer singular text', () => {
      const request: ApprovalRequest = {
        ...baseRequest,
        entity_type: 'form_submission',
        metadata: {
          field_label: 'Camp Sign-off',
          form_slug: 'camp-2026',
          responses: {
            single_answer: 'Yes',
          },
        },
      };

      render(<FormRegistrationInspectSection request={request} />);
      expect(screen.getByText('1 Answer')).toBeInTheDocument();
    });

    it('handles empty responses fallback', () => {
      const request: ApprovalRequest = {
        ...baseRequest,
        entity_type: 'form_submission',
        metadata: {},
      };

      render(<FormRegistrationInspectSection request={request} />);
      expect(screen.getByText('No submission answers recorded.')).toBeInTheDocument();
    });
  });

  describe('ApprovalInspectDialog', () => {
    it('renders fallback request details with complex array and object values', () => {
      const reqWithComplexMetadata: ApprovalRequest = {
        ...baseRequest,
        entity_type: 'recruitment_endorsement',
        // Omitting standard fields so fallback "Request Details" renders:
        metadata: {
          custom_tags: ['Urgent', 'Reviewed'],
          contact_details: {
            phone: '09123456789',
            address: { city: 'Pasig' },
            alternate: null,
          },
          plain_note: 'Standard note',
        },
      };

      renderWithClient(
        <ApprovalInspectDialog
          request={reqWithComplexMetadata}
          onClose={vi.fn()}
          onDecision={vi.fn()}
          decisionNotes=""
          onDecisionNotesChange={vi.fn()}
          isSubmitting={false}
          delegatedEmail=""
          onDelegatedEmailChange={vi.fn()}
          onDelegate={vi.fn()}
          isDelegating={false}
          slodUsers={[]}
          isLoadingSlod={false}
          attestationAnswers={null}
        />,
      );

      expect(screen.getByText('Request Details')).toBeInTheDocument();
      expect(screen.getByText('Urgent')).toBeInTheDocument();
      expect(screen.getByText('Reviewed')).toBeInTheDocument();
      expect(screen.getByText('phone:')).toBeInTheDocument();
      expect(screen.getByText('09123456789')).toBeInTheDocument();
      expect(screen.getByText('{"city":"Pasig"}')).toBeInTheDocument();
      expect(screen.getByText('Standard note')).toBeInTheDocument();
    });
  });
});
