import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { RecruitmentApplication } from '@/lib/domain/recruitment';

import { DGroupEndorsementPanel } from '../DGroupEndorsementPanel';

const mockMutateAsync = vi.fn().mockResolvedValue({ success: true });

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => ({
    data: {
      adminRole: 'admin',
      isAuthenticated: true,
      permissions: ['canWriteAdminData'],
    },
    can: () => true,
  }),
}));

vi.mock('@/hooks/domain/recruitment/mutations/useUpdateRecruitmentStageMutation', () => ({
  useUpdateRecruitmentStageMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const mockApplication: RecruitmentApplication = {
  id: 'app-1',
  auth_user_id: null,
  email: 'candidate@example.com',
  first_name: 'Test Timothy',
  middle_name: null,
  last_name: 'Test Paul',
  full_name: 'Test Timothy Paul',
  nickname: 'Test Tim',
  phone: '09171234567',
  date_of_birth: '1995-05-15',
  gender: 'Male',
  life_stage: 'Single',
  avatar_object_key: null,
  desired_role: 'Usher',
  confirmed_role: 'Usher',
  personal_details: { occupation: 'Designer', company_name: null, wedding_anniversary: null },
  emergency_contact: { name: 'Test Mary Paul', phone: '09181234567', relation: 'Mother' },
  application_history: { is_first_time_applicant: true, previous_application_notes: null },
  spiritual_background: {
    ccf_member_since: '2020 Jan',
    other_ministries: null,
    glc1_status: 'Completed',
    glc2_status: 'None',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2019 Jan',
    leader_name: 'Test Barnabas Leader',
    leader_email: 'barnabas@example.com',
    leader_phone: '09191234567',
    is_dgroup_leader: false,
    leader_since: null,
    dgroup_member_count: null,
  },
  applicant_attested_at: '2026-11-01T08:00:00+08:00',
  survey_answers: {},
  survey_score: 20,
  survey_total: 20,
  current_step: 3,
  status: 'active',
  dgroup_approval_id: null,
  vmt_registered: false,
  ccf_vmt_id: null,
  ccf_vmt_date: null,
  vmt_registered_at: null,
  vmt_verified_by: null,
  service_commitments: {},
  assigned_rfid_member_id: null,
  promoted_user_id: null,
  deployed_at: null,
  created_at: '2026-11-01T08:00:00+08:00',
  updated_at: '2026-11-01T08:00:00+08:00',
};

function renderPanel(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('DGroupEndorsementPanel', () => {
  it('renders leader information and pending state when endorsement is awaited', async () => {
    const user = userEvent.setup();
    renderPanel(<DGroupEndorsementPanel application={mockApplication} />);

    expect(screen.getByText('DGroup & Leader Information')).toBeInTheDocument();
    expect(screen.getByText('Test Barnabas Leader')).toBeInTheDocument();
    expect(screen.getAllByText('barnabas@example.com').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Pending Leader Review')).toBeInTheDocument();
    expect(screen.getByText(/Awaiting DGroup Leader Endorsement/i)).toBeInTheDocument();

    const resendBtn = screen.getByRole('button', { name: /Resend Endorsement Link/i });
    expect(resendBtn).toBeInTheDocument();
    await user.click(resendBtn);

    expect(mockMutateAsync).toHaveBeenCalledWith({
      action: 'resend_endorsement',
      application_id: 'app-1',
    });
  });

  it('renders endorsement questions and hides resend button when approved', () => {
    const endorsedApp = { ...mockApplication, dgroup_approval_id: 'appr-123' };
    renderPanel(
      <DGroupEndorsementPanel
        application={endorsedApp}
        endorsement={{
          approval_id: 'appr-123',
          status: 'approved',
          attestation_answers: {
            leader_full_name: 'Test Barnabas Leader',
            disciple_dgroup_since: '2019 Jan',
            eval_prayer_and_devotion: 3,
            eval_private_life_in_order: 3,
          },
        }}
      />,
    );

    expect(screen.getByText('Endorsed')).toBeInTheDocument();
    expect(screen.getByText(/DGroup Leader Endorsement Questionnaire/i)).toBeInTheDocument();
    expect(screen.queryByText(/Awaiting DGroup Leader Endorsement/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change dgroup leader/i })).toBeInTheDocument();
  });

  it('renders Change DGroup Leader button when endorsed and shows endorsement reset notice', async () => {
    const user = userEvent.setup();
    renderPanel(
      <DGroupEndorsementPanel
        application={mockApplication}
        endorsement={{
          approval_id: 'appr-123',
          status: 'approved',
          attestation_answers: { leader_full_name: 'Test Barnabas Leader' },
        }}
      />,
    );

    const changeLeaderBtn = screen.getByRole('button', { name: /change dgroup leader/i });
    expect(changeLeaderBtn).toBeInTheDocument();

    await user.click(changeLeaderBtn);
    expect(screen.getByRole('heading', { name: /change dgroup leader/i })).toBeInTheDocument();
    expect(screen.getByText(/This applicant has already been endorsed/i)).toBeInTheDocument();
  });

  it('does not render resend button when applicant is deployed', () => {
    const deployedApp = { ...mockApplication, status: 'deployed' as const };
    renderPanel(<DGroupEndorsementPanel application={deployedApp} />);

    expect(screen.queryByRole('button', { name: /resend/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Awaiting DGroup Leader Endorsement/i)).not.toBeInTheDocument();
  });

  it('renders declined notice when endorsement is rejected', () => {
    renderPanel(
      <DGroupEndorsementPanel
        application={mockApplication}
        endorsement={{
          approval_id: 'appr-123',
          status: 'rejected',
          decision_notes: 'Candidate needs more time in DGroup before serving.',
        }}
      />,
    );

    expect(screen.getByText('Endorsement Declined')).toBeInTheDocument();
    expect(screen.getByText(/Endorsement Declined by Leader/i)).toBeInTheDocument();
    expect(screen.getByText(/Candidate needs more time in DGroup/i)).toBeInTheDocument();
  });

  it('renders Change DGroup Leader button when pending and opens action dialog', async () => {
    const user = userEvent.setup();
    renderPanel(<DGroupEndorsementPanel application={mockApplication} />);

    const changeLeaderBtn = screen.getByRole('button', { name: /change dgroup leader/i });
    expect(changeLeaderBtn).toBeInTheDocument();

    await user.click(changeLeaderBtn);
    expect(screen.getByRole('heading', { name: /change dgroup leader/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Barnabas Leader')).toBeInTheDocument();
  });

  it('renders Request Endorsement Again button when declined and opens action dialog', async () => {
    const user = userEvent.setup();
    renderPanel(
      <DGroupEndorsementPanel
        application={mockApplication}
        endorsement={{
          approval_id: 'appr-123',
          status: 'rejected',
          decision_notes: 'Needs more time.',
        }}
      />,
    );

    const reRequestBtn = screen.getByRole('button', { name: /request endorsement again/i });
    expect(reRequestBtn).toBeInTheDocument();

    await user.click(reRequestBtn);
    expect(screen.getByRole('heading', { name: /request endorsement again/i })).toBeInTheDocument();
  });

  it('renders Endorsement History section when multiple attempts exist and expands on click', async () => {
    const user = userEvent.setup();
    renderPanel(
      <DGroupEndorsementPanel
        application={mockApplication}
        endorsement={{
          approval_id: 'appr-2',
          status: 'pending',
        }}
        endorsementHistory={[
          {
            approval_id: 'appr-2',
            status: 'pending',
            assigned_to_email: 'newleader@example.com',
            created_at: '2026-11-03T00:00:00+00:00',
          },
          {
            approval_id: 'appr-1',
            status: 'rejected',
            assigned_to_email: 'oldleader@example.com',
            created_at: '2026-11-01T00:00:00+00:00',
            decided_at: '2026-11-02T00:00:00+00:00',
            decision_notes: 'Needs spiritual maturity.',
          },
        ]}
      />,
    );

    expect(screen.getByText(/Endorsement History \(2 attempts\)/i)).toBeInTheDocument();
    expect(screen.queryByText('Attempt #1')).not.toBeInTheDocument();

    const historyToggle = screen.getByRole('button', {
      name: /endorsement history \(2 attempts\)/i,
    });
    await user.click(historyToggle);

    expect(screen.getByText('Attempt #2')).toBeInTheDocument();
    expect(screen.getByText('Attempt #1')).toBeInTheDocument();
    expect(screen.getByText(/Needs spiritual maturity/i)).toBeInTheDocument();
  });
});
