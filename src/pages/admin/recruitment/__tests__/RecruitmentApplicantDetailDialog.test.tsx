import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  RecruitmentApplication,
  RecruitmentPipelineTransaction,
} from '@/lib/domain/recruitment';

import { RecruitmentApplicantDetailDialog } from '../components/dialog/RecruitmentApplicantDetailDialog';

const mockApplication: RecruitmentApplication = {
  id: 'app-123',
  auth_user_id: null,
  email: 'applicant@example.com',
  first_name: 'Test Timothy',
  middle_name: null,
  last_name: 'Test Paul',
  full_name: 'Test Timothy Paul',
  nickname: 'Test Tim',
  phone: '09179998888',
  date_of_birth: '1998-08-10',
  gender: 'Male',
  life_stage: 'Single',
  avatar_object_key: null,
  desired_role: 'Usher',
  confirmed_role: 'Usher',
  personal_details: {
    occupation: 'Teacher',
    company_name: 'School',
    wedding_anniversary: null,
  },
  emergency_contact: {
    name: 'Test Eunice Paul',
    phone: '09189998888',
    relation: 'Mother',
  },
  application_history: {
    is_first_time_applicant: true,
    previous_application_notes: null,
  },
  spiritual_background: {
    ccf_member_since: '2021 Jan',
    other_ministries: null,
    glc1_status: 'Completed',
    glc2_status: 'None',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2020 Jan',
    leader_name: 'Test Paul Mentor',
    leader_email: 'paul@example.com',
    leader_phone: '09199998888',
    is_dgroup_leader: false,
    leader_since: null,
    dgroup_member_count: null,
  },
  applicant_attested_at: '2026-11-01T08:00:00+08:00',
  survey_answers: { survey_q1: 'true' },
  survey_score: 20,
  survey_total: 20,
  current_step: 4,
  status: 'active',
  dgroup_approval_id: 'appr-1',
  vmt_registered: false,
  ccf_vmt_id: null,
  ccf_vmt_date: null,
  vmt_registered_at: null,
  vmt_verified_by: null,
  service_commitments: { first_sunday: ['9AM'] },
  assigned_rfid_member_id: null,
  promoted_user_id: null,
  deployed_at: null,
  created_at: '2026-11-01T08:00:00+08:00',
  updated_at: '2026-11-01T08:00:00+08:00',
};

const mockTransaction: RecruitmentPipelineTransaction = {
  id: 'tx-1',
  application_id: 'app-123',
  step_number: 4,
  step_key: 'observation',
  attempt_number: 1,
  transaction_type: 'scheduled',
  from_step: 3,
  to_step: 4,
  status: 'scheduled',
  assigned_reviewer_id: 'user-1',
  assigned_reviewer_name: 'Lead Usher',
  scheduled_at: '2026-11-10T09:00:00+08:00',
  completed_at: null,
  rubric_data: {},
  notes: 'First shadow session with seasoned team',
  applicant_visible_notes: 'Please arrive 15 minutes before 9AM service.',
  created_by_user_id: 'user-1',
  created_at: '2026-11-02T10:00:00+08:00',
};

vi.mock('@/hooks/domain/recruitment', () => ({
  useAdminRecruitmentApplicationDetailQuery: () => ({
    data: {
      application: mockApplication,
      transactions: [mockTransaction],
    },
    isLoading: false,
  }),
  useUpdateRecruitmentStageMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeployRecruitmentApplicantMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useRecruitmentSettingsQuery: () => ({
    data: {
      survey_questions: [
        {
          id: 'sq_1',
          field_key: 'survey_q1',
          label: 'Jesus Christ is God.',
          correct_answer: 'true',
          explanation: 'John 1:1',
        },
      ],
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => ({
    adminRole: 'admin',
    can: () => true,
    user: { id: 'admin-1' },
  }),
  useApproverUsersQuery: () => ({
    data: [{ id: 'user-1', name: 'Lead Usher', role: 'slod' }],
  }),
}));

function renderDialog(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('RecruitmentApplicantDetailDialog', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders modal with applicant name, role, and step', () => {
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Test Timothy Paul (Test Tim)' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Usher').length).toBeGreaterThan(0);
    expect(screen.getByText('Step 4: Observation')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /9-step pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /biblical survey/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /applicant profile/i })).toBeInTheDocument();
  });

  it('renders Step 4 Observation controls and history in Pipeline tab', () => {
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    expect(screen.getByText('Pipeline Transaction History')).toBeInTheDocument();
    expect(screen.getByText(/Attempt #1 \(scheduled\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/First shadow session with seasoned team/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByRole('button', { name: /complete step 4/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /repeat observation/i })).toBeInTheDocument();
  });

  it('displays confirmed ministry role badge on Step 4 and shows role selector on Step 2', async () => {
    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // On Step 4, Final Ministry Role badge is shown, selector is not in the active step
    expect(screen.getByText('Final Ministry Role:')).toBeInTheDocument();
    expect(screen.queryByText('Confirmed Ministry Role')).not.toBeInTheDocument();

    // Click on Step 2 button to jump to Interview
    await user.click(screen.getByRole('button', { name: /^interview$/i }));
    expect(screen.getByText('Confirmed Ministry Role')).toBeInTheDocument();
  });

  it('switches to Biblical Survey tab and displays score breakdown', async () => {
    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /biblical survey/i }));

    expect(screen.getByText('20 / 20')).toBeInTheDocument();
    expect(screen.getByText('100% Accuracy')).toBeInTheDocument();
    expect(screen.getByText('Jesus Christ is God.')).toBeInTheDocument();
    expect(screen.getByText('Scripture Guide:')).toBeInTheDocument();
  });

  it('switches to Applicant Profile tab and displays 40-field details', async () => {
    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('button', { name: /applicant profile/i }));

    expect(screen.getByText('Demographics & Work')).toBeInTheDocument();
    expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
    expect(screen.getByText('Test Eunice Paul')).toBeInTheDocument();
    expect(screen.getByText('Spiritual Background & GLC')).toBeInTheDocument();
    expect(screen.getByText('DGroup & Leader Attestation')).toBeInTheDocument();
    expect(screen.getByText('Test Paul Mentor')).toBeInTheDocument();
  });

  it('calls onClose when Close button is clicked', async () => {
    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    const closeButton = screen.getByRole('button', { name: /^close$/i });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
