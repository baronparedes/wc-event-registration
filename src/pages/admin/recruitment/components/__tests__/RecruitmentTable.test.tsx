import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecruitmentApplication } from '@/lib/domain/recruitment';

import { RecruitmentTable } from '../RecruitmentTable';

function createMockApplication(overrides: Partial<RecruitmentApplication>): RecruitmentApplication {
  return {
    id: 'app-default-id',
    auth_user_id: null,
    email: 'test.applicant@example.com',
    first_name: 'Test Maria',
    middle_name: null,
    last_name: 'Test Santos',
    full_name: 'Test Maria Santos',
    nickname: 'Test Mars',
    phone: '09171234567',
    date_of_birth: '1996-03-20',
    gender: 'Female',
    life_stage: 'Single',
    avatar_object_key: null,
    desired_role: 'Prayer Coach',
    confirmed_role: 'Prayer Coach',
    personal_details: {
      occupation: 'Accountant',
      company_name: null,
      wedding_anniversary: null,
    },
    emergency_contact: {
      name: 'Test Jose Santos',
      phone: '09181234567',
      relation: 'Father',
    },
    application_history: {
      is_first_time_applicant: true,
      previous_application_notes: null,
    },
    spiritual_background: {
      ccf_member_since: '2019',
      other_ministries: null,
      glc1_status: 'Completed',
      glc2_status: 'Completed',
    },
    dgroup_info: {
      is_constant_attendee: true,
      member_since: '2018',
      leader_name: 'Test Grace Leader',
      leader_email: 'grace@example.com',
      leader_phone: '09191234567',
      is_dgroup_leader: false,
      leader_since: null,
      dgroup_member_count: null,
    },
    applicant_attested_at: '2026-11-01T10:00:00Z',
    survey_answers: {},
    survey_score: 19,
    survey_total: 20,
    current_step: 2,
    status: 'active',
    dgroup_approval_id: 'approval-123',
    vmt_registered: false,
    ccf_vmt_id: null,
    ccf_vmt_date: null,
    vmt_registered_at: null,
    vmt_verified_by: null,
    service_commitments: {},
    assigned_rfid_member_id: null,
    promoted_user_id: null,
    deployed_at: null,
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    ...overrides,
  };
}

const sampleApplications: RecruitmentApplication[] = [
  createMockApplication({
    id: 'app-1',
    full_name: 'Test Maria Santos',
    nickname: 'Test Mars',
    email: 'maria@example.com',
    status: 'active',
    current_step: 2,
    survey_score: 19,
    survey_total: 20,
    dgroup_approval_id: 'approval-123',
  }),
  createMockApplication({
    id: 'app-2',
    full_name: 'Test Juan Dela Cruz',
    nickname: '',
    email: 'juan@example.com',
    confirmed_role: null,
    desired_role: 'Backroom Support',
    status: 'deployed',
    current_step: 9,
    survey_score: 15,
    survey_total: 20,
    dgroup_approval_id: null,
  }),
  createMockApplication({
    id: 'app-3',
    full_name: 'Test Archived Applicant',
    nickname: '',
    email: 'archived@example.com',
    status: 'archived',
    current_step: 3,
    survey_score: 12,
    survey_total: 20,
    dgroup_approval_id: null,
  }),
];

describe('RecruitmentTable', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderWithClient = (ui: React.ReactElement) => {
    return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
  };

  it('renders table headers and applicant rows properly', () => {
    const handleSelect = vi.fn();
    renderWithClient(
      <RecruitmentTable applications={sampleApplications} onSelectApplication={handleSelect} />,
    );

    expect(screen.getByText('Applicant')).toBeInTheDocument();
    expect(screen.getByText('Current Step')).toBeInTheDocument();
    expect(screen.getByText('Endorsement')).toBeInTheDocument();
    expect(screen.getByText('Survey Score')).toBeInTheDocument();

    expect(screen.getByText(/Test Maria Santos \(Test Mars\)/i)).toBeInTheDocument();
    expect(screen.getByText('maria@example.com')).toBeInTheDocument();
    expect(screen.getByText('Test Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('19 / 20')).toBeInTheDocument();
    expect(screen.getByText('15 / 20')).toBeInTheDocument();
    expect(screen.getByText('Linked')).toBeInTheDocument();
    expect(screen.getAllByText('Pending').length).toBe(2);
  });

  it('triggers onSelectApplication when Review button is clicked', () => {
    const handleSelect = vi.fn();
    renderWithClient(
      <RecruitmentTable applications={sampleApplications} onSelectApplication={handleSelect} />,
    );

    const reviewButtons = screen.getAllByRole('button', { name: /Review/i });
    fireEvent.click(reviewButtons[0]);

    expect(handleSelect).toHaveBeenCalledWith(sampleApplications[0]);
  });
});
