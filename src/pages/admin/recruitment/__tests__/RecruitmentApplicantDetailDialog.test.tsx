import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
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
  assigned_reviewer_name: 'Test Lead Usher',
  scheduled_at: '2026-11-10T09:00:00+08:00',
  completed_at: null,
  rubric_data: {},
  notes: 'First shadow session with seasoned team',
  applicant_visible_notes: 'Please arrive 15 minutes before 9AM service.',
  created_by_user_id: 'user-1',
  created_at: '2026-11-02T10:00:00+08:00',
};

const { mockDetailQuery, mockUpdateStageMutate } = vi.hoisted(() => ({
  mockDetailQuery: vi.fn(),
  mockUpdateStageMutate: vi.fn(),
}));

vi.mock('@/hooks/domain/recruitment', () => ({
  useAdminRecruitmentApplicationDetailQuery: () => mockDetailQuery(),
  useUpdateRecruitmentStageMutation: () => ({
    mutate: mockUpdateStageMutate,
    mutateAsync: mockUpdateStageMutate,
    isPending: false,
  }),
  useAddRecruiterNoteMutation: () => ({
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
  useReviewerUsersQuery: () => ({
    data: [
      {
        id: 'user-1',
        name: 'Test Lead Usher',
        full_name: 'Test Lead Usher',
        nickname: null,
        email: 'usher@example.com',
        role: 'OIC',
        avatar_object_key: null,
      },
    ],
    isLoading: false,
    isFetching: false,
  }),
  useReviewerUserByIdQuery: (id?: string) => ({
    data:
      id === 'user-pastor'
        ? {
            id: 'user-pastor',
            name: 'Test Pastor Dave',
            full_name: 'Test Pastor Dave',
            nickname: null,
            email: 'pastor@example.com',
            role: 'Pastor',
            avatar_object_key: null,
          }
        : {
            id: 'user-1',
            name: 'Test Lead Usher',
            full_name: 'Test Lead Usher',
            nickname: null,
            email: 'usher@example.com',
            role: 'OIC',
            avatar_object_key: null,
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
    data: [{ id: 'user-1', name: 'Test Lead Usher', role: 'slod' }],
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
    mockDetailQuery.mockReturnValue({
      data: {
        application: mockApplication,
        transactions: [mockTransaction],
      },
      isLoading: false,
    });
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
    expect(screen.getByRole('tab', { name: /9-step pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /biblical survey/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /dgroup endorsement/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /applicant profile/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /transaction history/i })).toBeInTheDocument();
  });

  it('renders Step 4 Observation controls in Pipeline tab and history in Transaction History tab', async () => {
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('button', { name: /complete step 4/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /repeat observation/i })).toBeInTheDocument();

    // Switch to Transaction History tab
    await userEvent.click(screen.getByRole('tab', { name: /transaction history/i }));
    expect(screen.getByText('Pipeline Transaction History')).toBeInTheDocument();
    expect(screen.getByText(/Step 4: Observation — Session Scheduled/i)).toBeInTheDocument();
    expect(screen.getAllByText(/First shadow session with seasoned team/i).length).toBeGreaterThan(
      0,
    );
  });

  it('displays confirmed ministry role badge on Step 4 and shows role selector when Step 2 is active', () => {
    const { unmount } = renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // On Step 4, Final Ministry Role badge is shown, selector is not in the active step
    expect(screen.getByText('Final Ministry Role:')).toBeInTheDocument();
    expect(screen.queryByText('Confirmed Ministry Role')).not.toBeInTheDocument();
    unmount();

    // When candidate is at Step 2 (Interview), the role selector is present
    mockDetailQuery.mockReturnValue({
      data: {
        application: { ...mockApplication, current_step: 2 },
        transactions: [mockTransaction],
      },
      isLoading: false,
    });
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={{ ...mockApplication, current_step: 2 }}
        isOpen={true}
        onClose={onClose}
      />,
    );
    expect(screen.getByText(/Confirmed Ministry Role/i)).toBeInTheDocument();
  });

  it('requires all step details before enabling Complete Step button', () => {
    mockDetailQuery.mockReturnValue({
      data: {
        application: { ...mockApplication, current_step: 2 },
        // Step 2 has no transaction yet (empty reviewer, date, notes)
        transactions: [],
      },
      isLoading: false,
    });
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={{ ...mockApplication, current_step: 2 }}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Verify required notice is displayed
    expect(screen.getByText(/Required before completing Step 2/i)).toBeInTheDocument();
    expect(screen.getAllByText('Assigned To').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Session Date & Time').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /select sunday date & time/i })).toBeInTheDocument();
    expect(screen.getByText('Recruitment Notes / Feedback')).toBeInTheDocument();

    // Verify Complete Step button is disabled
    const completeBtn = screen.getByRole('button', { name: /complete step 2/i });
    expect(completeBtn).toBeDisabled();
  });

  it('opens confirmation modal before completing step and submits upon confirmation', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const readyStep2Tx: RecruitmentPipelineTransaction = {
      ...mockTransaction,
      step_number: 2,
      step_key: 'interview',
      from_step: 1,
      to_step: 2,
      assigned_reviewer_id: 'user-oic-1',
      assigned_reviewer_name: 'Test Paul Apostle (Test OIC Paul)',
      scheduled_at: '2026-11-08T09:00:00+08:00',
      notes: 'Completed evaluation with positive notes.',
    };

    mockDetailQuery.mockReturnValue({
      data: {
        application: { ...mockApplication, current_step: 2 },
        transactions: [readyStep2Tx],
      },
      isLoading: false,
      isError: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={{ ...mockApplication, current_step: 2 }}
        isOpen={true}
        onClose={onClose}
      />,
    );

    const completeBtn = screen.getByRole('button', { name: /complete step 2/i });
    expect(completeBtn).toBeEnabled();

    await user.click(completeBtn);

    // Verify confirmation modal appears
    expect(screen.getByText('Confirm Step 2 Completion')).toBeInTheDocument();
    expect(screen.getAllByText('Interview').length).toBeGreaterThan(0);
    expect(screen.getByText('Next: Step 3')).toBeInTheDocument();

    const confirmCompleteBtn = screen.getByRole('button', { name: /confirm & complete step 2/i });
    await user.click(confirmCompleteBtn);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        step_number: 2,
        status: 'completed',
      }),
      expect.any(Object),
    );
  });

  it('locks scheduling and actions on future steps', async () => {
    const user = userEvent.setup();
    mockDetailQuery.mockReturnValue({
      data: {
        application: { ...mockApplication, current_step: 2 },
        transactions: [mockTransaction],
      },
      isLoading: false,
    });
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={{ ...mockApplication, current_step: 2 }}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Click on Step 5 (Evaluation) while candidate is at Step 2
    await user.click(screen.getByRole('tab', { name: /eval/i }));

    // Verify it displays the Step Locked card
    expect(screen.getByText('Step 5 is Locked')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /complete step 5/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /schedule session/i })).not.toBeInTheDocument();
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

    await user.click(screen.getByRole('tab', { name: /biblical survey/i }));

    expect(screen.getByText('20 / 20')).toBeInTheDocument();
    expect(screen.getByText('100% Accuracy')).toBeInTheDocument();
    // Default filter is 'incorrect' - for 100% applicant, shows all correct notice
    expect(
      screen.getByText('Candidate answered all surveyed questions correctly!'),
    ).toBeInTheDocument();

    // Switching to All Questions shows the question list
    await user.click(screen.getByRole('tab', { name: /all questions/i }));
    expect(screen.getByText('Jesus Christ is God.')).toBeInTheDocument();
    expect(screen.getByText('Scripture Guide:')).toBeInTheDocument();
  });

  it('displays survey results when viewing Step 1 in Pipeline tab', async () => {
    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Click on Step 1: Register in the stepper
    await user.click(screen.getByRole('tab', { name: /register/i }));

    // Verify Step 1 renders survey results
    expect(screen.getByText('Biblical Survey Results')).toBeInTheDocument();
    expect(screen.getByText('Doctrinal Survey Score')).toBeInTheDocument();
    expect(screen.getByText('20 / 20')).toBeInTheDocument();
    expect(screen.getByText('100% Accuracy')).toBeInTheDocument();
    // Default filter is 'incorrect'
    expect(
      screen.getByText('Candidate answered all surveyed questions correctly!'),
    ).toBeInTheDocument();

    // Switching to All Questions shows the question list
    await user.click(screen.getByRole('tab', { name: /all questions/i }));
    expect(screen.getByText('Jesus Christ is God.')).toBeInTheDocument();
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

    await user.click(screen.getByRole('tab', { name: /applicant profile/i }));

    expect(screen.getByText('Demographics & Work')).toBeInTheDocument();
    expect(screen.getByText('Emergency Contact')).toBeInTheDocument();
    expect(screen.getByText('Test Eunice Paul')).toBeInTheDocument();
    expect(screen.getByText('Spiritual Background & GLC')).toBeInTheDocument();
    expect(screen.getByText('DGroup & Leader Attestation')).toBeInTheDocument();
    expect(screen.getByText('Test Paul Mentor')).toBeInTheDocument();
  });

  it('shows confirmation dialog before resending endorsement magic-link email in profile tab', async () => {
    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /applicant profile/i }));

    const resendBtn = screen.getByRole('button', { name: /Resend Endorsement Email/i });
    expect(resendBtn).toHaveClass('w-full', 'sm:w-auto');

    // Click button to open confirmation dialog
    await user.click(resendBtn);

    // Verify confirmation dialog appears with leader details
    const alertDialog = screen.getByRole('alertdialog');
    expect(
      within(alertDialog).getByRole('heading', { name: 'Resend Endorsement Email' }),
    ).toBeInTheDocument();
    expect(within(alertDialog).getByText(/Test Paul Mentor/i)).toBeInTheDocument();
    expect(within(alertDialog).getByText(/paul@example.com/i)).toBeInTheDocument();

    // Confirm resending
    const confirmBtn = within(alertDialog).getByRole('button', { name: 'Resend Email' });
    await user.click(confirmBtn);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      {
        action: 'resend_endorsement',
        application_id: 'app-123',
      },
      expect.any(Object),
    );
  });

  it('displays recorded details in read-only mode when viewing an already completed step', async () => {
    const user = userEvent.setup();
    const mockStep2CompletedTx: RecruitmentPipelineTransaction = {
      id: 'tx-step2',
      application_id: 'app-123',
      step_number: 2,
      step_key: 'interview',
      attempt_number: 1,
      transaction_type: 'completed',
      from_step: 1,
      to_step: 2,
      status: 'completed',
      assigned_reviewer_id: 'user-pastor',
      assigned_reviewer_name: 'Test Pastor Dave',
      scheduled_at: '2026-11-02T10:00:00+08:00',
      completed_at: '2026-11-02T11:00:00+08:00',
      rubric_data: {},
      notes: 'Candidate showed great heart for welcoming guests and solid doctrine.',
      applicant_visible_notes: 'Great meeting you! Looking forward to your orientation.',
      created_by_user_id: 'user-pastor',
      created_at: '2026-11-02T11:00:00+08:00',
    };

    mockDetailQuery.mockReturnValue({
      data: {
        application: mockApplication,
        transactions: [mockStep2CompletedTx, mockTransaction],
        step_notes: [
          {
            id: 'sn-1',
            application_id: 'app-123',
            step_number: 2,
            attempt_number: 1,
            author_id: 'user-pastor',
            author_name: 'Test Pastor Dave',
            author_role: 'Pastor',
            avatar_object_key: null,
            content: 'Candidate showed great heart for welcoming guests and solid doctrine.',
            created_at: '2026-11-02T11:00:00+08:00',
          },
        ],
      },
      isLoading: false,
      isError: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Switch to completed Step 2 (Interview)
    const step2Tab = screen.getByRole('tab', { name: /^interview$/i });
    await user.click(step2Tab);

    // Verify CompletedStepCard is present
    expect(screen.getByText('Step 2 is Completed')).toBeInTheDocument();

    // Verify recorded reviewer and notes are visible in the recruiter notes thread
    expect(screen.getAllByText('Test Pastor Dave').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Candidate showed great heart for welcoming guests and solid doctrine.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Great meeting you! Looking forward to your orientation.'),
    ).not.toBeInTheDocument();

    // Verify action buttons are hidden since step is already completed
    expect(screen.queryByRole('button', { name: /complete step 2/i })).not.toBeInTheDocument();
  });

  it('displays previous interview attempts intact when an interview is repeated', () => {
    const mockStep2Attempt1Tx: RecruitmentPipelineTransaction = {
      id: 'tx-step2-att1',
      application_id: 'app-123',
      step_number: 2,
      step_key: 'interview',
      attempt_number: 1,
      transaction_type: 'repeated_step',
      from_step: 2,
      to_step: 2,
      status: 'completed',
      assigned_reviewer_id: 'user-pastor',
      assigned_reviewer_name: 'Test Pastor Dave',
      scheduled_at: '2026-11-02T10:00:00+08:00',
      completed_at: '2026-11-02T11:00:00+08:00',
      rubric_data: {},
      notes:
        'Initial interview: Candidate requested more time to discuss availability with family.',
      applicant_visible_notes: 'Follow-up interview scheduled for next week.',
      created_by_user_id: 'user-pastor',
      created_at: '2026-11-02T11:00:00+08:00',
    };

    const mockStep2Attempt2Tx: RecruitmentPipelineTransaction = {
      id: 'tx-step2-att2',
      application_id: 'app-123',
      step_number: 2,
      step_key: 'interview',
      attempt_number: 2,
      transaction_type: 'scheduled',
      from_step: 2,
      to_step: 2,
      status: 'scheduled',
      assigned_reviewer_id: 'user-coach',
      assigned_reviewer_name: 'Test Elder Mark',
      scheduled_at: '2026-11-09T10:00:00+08:00',
      completed_at: null,
      rubric_data: {},
      notes: null,
      applicant_visible_notes: null,
      created_by_user_id: 'user-coach',
      created_at: '2026-11-03T10:00:00+08:00',
    };

    const activeStep2Application = {
      ...mockApplication,
      current_step: 2 as const,
    };

    mockDetailQuery.mockReturnValue({
      data: {
        application: activeStep2Application,
        transactions: [mockStep2Attempt1Tx, mockStep2Attempt2Tx],
      },
      isLoading: false,
      isError: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={activeStep2Application}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Verify Previous Interview Attempts card displays Attempt #1 data intact
    expect(screen.getByText('Previous Interview Attempts (1)')).toBeInTheDocument();
    expect(screen.getByText('Recorded History Intact')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'Initial interview: Candidate requested more time to discuss availability with family.',
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Test Pastor Dave').length).toBeGreaterThanOrEqual(1);

    // Verify current session indicates Attempt #2
    expect(screen.getByText('Attempt #2')).toBeInTheDocument();

    // Verify Repeat Interview button is rendered on Step 2
    const repeatButton = screen.getByRole('button', { name: /repeat interview \(step 2\)/i });
    expect(repeatButton).toBeInTheDocument();
  });

  it('triggers return_to_interview when returning candidate from Step 3 to Step 2', async () => {
    const user = userEvent.setup();
    const activeStep3Application = {
      ...mockApplication,
      current_step: 3 as const,
    };

    const mockStep3Tx: RecruitmentPipelineTransaction = {
      id: 'tx-step3',
      application_id: 'app-123',
      step_number: 3,
      step_key: 'orientation',
      attempt_number: 1,
      transaction_type: 'scheduled',
      from_step: 2,
      to_step: 3,
      status: 'scheduled',
      assigned_reviewer_id: 'user-1',
      assigned_reviewer_name: 'Test Lead Usher',
      scheduled_at: '2026-11-10T09:00:00+08:00',
      completed_at: null,
      rubric_data: {},
      notes: null,
      applicant_visible_notes: null,
      created_by_user_id: 'user-1',
      created_at: '2026-11-03T10:00:00+08:00',
    };

    mockDetailQuery.mockReturnValue({
      data: {
        application: activeStep3Application,
        transactions: [mockStep3Tx],
      },
      isLoading: false,
      isError: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={activeStep3Application}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // On Step 3 Orientation, find "Needs Another Interview (Return to Step 2)" button
    const returnButton = screen.getByRole('button', {
      name: /needs another interview \(return to step 2\)/i,
    });
    expect(returnButton).toBeInTheDocument();

    await user.click(returnButton);

    // Verify confirmation dialog opens with details before submitting mutation
    expect(screen.getByText('Confirm Return to Interview Schedule')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /confirm & return to interview/i,
    });
    await user.click(confirmButton);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'return_to_interview',
        step_number: 3,
        status: 'scheduled',
      }),
      expect.any(Object),
    );
  });

  it('opens confirmation modal before scheduling or rescheduling and allows cancellation', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const activeStep4Application: RecruitmentApplication = {
      ...mockApplication,
      current_step: 4,
    };

    const mockStep4Tx: RecruitmentPipelineTransaction = {
      id: 'tx-sched-4',
      application_id: mockApplication.id,
      step_number: 4,
      step_key: 'observation',
      from_step: 3,
      to_step: 4,
      transaction_type: 'scheduled',
      status: 'scheduled',
      attempt_number: 1,
      assigned_reviewer_id: 'user-oic-1',
      assigned_reviewer_name: 'Test Paul Apostle (Test OIC Paul)',
      scheduled_at: '2026-11-08T09:00:00+08:00',
      completed_at: null,
      rubric_data: {},
      notes: 'Initial observation scheduled.',
      applicant_visible_notes: null,
      created_by_user_id: 'user-1',
      created_at: '2026-11-03T10:00:00+08:00',
    };

    mockDetailQuery.mockReturnValue({
      data: {
        application: activeStep4Application,
        transactions: [mockStep4Tx],
      },
      isLoading: false,
      isError: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={activeStep4Application}
        isOpen={true}
        onClose={onClose}
      />,
    );

    const updateScheduleBtn = screen.getByRole('button', { name: /update schedule/i });
    expect(updateScheduleBtn).toBeInTheDocument();

    await user.click(updateScheduleBtn);

    // Confirmation modal should be visible
    expect(screen.getByText('Confirm Session Reschedule')).toBeInTheDocument();
    expect(screen.getAllByText('Test Paul Apostle (Test OIC Paul)').length).toBeGreaterThanOrEqual(
      1,
    );

    // Cancel closes dialog without mutation
    const cancelBtn = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelBtn);
    expect(mockUpdateStageMutate).not.toHaveBeenCalled();
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

  it('renders DGroup Endorsement tab with leader information and endorsement questions', async () => {
    const user = userEvent.setup();
    mockDetailQuery.mockReturnValue({
      data: {
        application: mockApplication,
        transactions: [mockTransaction],
        dgroup_endorsement: {
          approval_id: 'appr-1',
          status: 'approved',
          attestation_answers: {
            leader_full_name: 'Test Paul Mentor',
            disciple_dgroup_since: '2020 Jan',
            eval_prayer_and_devotion: 3,
          },
        },
      },
      isLoading: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /dgroup endorsement/i }));

    expect(screen.getByText('DGroup & Leader Information')).toBeInTheDocument();
    expect(screen.getAllByText('Test Paul Mentor').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Endorsed & Linked')).toBeInTheDocument();
  });

  it('correctly reflects pending DGroup endorsement status on Step 1 when approval is pending', async () => {
    const user = userEvent.setup();
    mockDetailQuery.mockReturnValue({
      data: {
        application: mockApplication,
        transactions: [mockTransaction],
        dgroup_endorsement: {
          approval_id: 'appr-pending',
          status: 'pending',
          attestation_answers: null,
        },
      },
      isLoading: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Step 4 is active by default. Jump to Step 1 in Stepper
    await user.click(screen.getByRole('tab', { name: /register/i }));
    expect(screen.getByText('Pending Leader Endorsement')).toBeInTheDocument();
    expect(screen.queryByText('Endorsed & Linked')).not.toBeInTheDocument();
  });

  it('allows archiving an active applicant with notes', async () => {
    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Click Archive button in footer
    const archiveBtn = screen.getByRole('button', { name: /^archive$/i });
    expect(archiveBtn).toBeInTheDocument();
    expect(archiveBtn).toHaveClass('text-danger');
    await user.click(archiveBtn);

    // Archive confirmation dialog opens
    expect(screen.getByRole('heading', { name: /^archive applicant$/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Pausing this applicant will move them to the Archived list/i),
    ).toBeInTheDocument();

    // Type notes
    const notesInput = screen.getByPlaceholderText(/Applicant requested a pause/i);
    await user.type(notesInput, 'Candidate requested break until January');

    // Confirm archive
    const confirmBtn = screen.getByRole('button', { name: /^Archive Applicant$/i });
    await user.click(confirmBtn);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'archive_applicant',
        application_id: mockApplication.id,
        notes: 'Candidate requested break until January',
      }),
    );
  });

  it('allows restoring an archived applicant', async () => {
    const user = userEvent.setup();
    const archivedApp = { ...mockApplication, status: 'archived' as const };
    mockDetailQuery.mockReturnValue({
      data: {
        application: archivedApp,
        transactions: [mockTransaction],
      },
      isLoading: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={archivedApp}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Verify Archived status badge is using destructive styling
    const archivedBadge = screen.getByText('Archived');
    expect(archivedBadge).toHaveClass('bg-red-600/50');

    // Click Restore button in header
    const restoreBtn = screen.getByRole('button', { name: /restore to active/i });
    expect(restoreBtn).toBeInTheDocument();
    await user.click(restoreBtn);

    // Restore confirmation dialog opens
    expect(
      screen.getByRole('heading', { name: /^restore applicant to active$/i }),
    ).toBeInTheDocument();

    // Confirm restore
    const confirmBtn = screen.getByRole('button', { name: /^Restore Applicant$/i });
    await user.click(confirmBtn);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'restore_applicant',
        application_id: archivedApp.id,
      }),
    );
  });
});
