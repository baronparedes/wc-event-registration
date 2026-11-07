import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  RecruitmentApplication,
  RecruitmentPipelineTransaction,
} from '@/lib/domain/recruitment';

import { RecruitmentApplicantDetailDialog } from '../components/dialog/RecruitmentApplicantDetailDialog';
import { mockApplication, mockTransaction, renderDialog } from './testDetailDialogHelpers';

const {
  mockDetailQuery,
  mockUpdateStageMutate,
  mockDeployApplicantMutate,
  mockAddRecruiterNoteMutate,
  mockNavigate,
} = vi.hoisted(() => ({
  mockDetailQuery: vi.fn(),
  mockUpdateStageMutate: vi.fn(),
  mockDeployApplicantMutate: vi.fn(),
  mockAddRecruiterNoteMutate: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/hooks/domain/recruitment', () => ({
  useAdminRecruitmentApplicationDetailQuery: () => mockDetailQuery(),
  useUpdateRecruitmentStageMutation: () => ({
    mutate: mockUpdateStageMutate,
    mutateAsync: mockUpdateStageMutate,
    isPending: false,
  }),
  useAddRecruiterNoteMutation: () => ({
    mutate: mockAddRecruiterNoteMutate,
    isPending: false,
  }),
  useDeployRecruitmentApplicantMutation: () => ({
    mutate: mockDeployApplicantMutate,
    isPending: false,
  }),
  useUploadRecruitmentAvatarMutation: () => ({
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
    data: { adminRole: 'admin' },
    adminRole: 'admin',
    can: () => true,
    user: { id: 'admin-1' },
  }),
  useApproverUsersQuery: () => ({
    data: [{ id: 'user-1', name: 'Test Lead Usher', role: 'slod' }],
  }),
}));

describe('RecruitmentDetailDialog - Pipeline Steps', () => {
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

  it('renders Step 4 Observation controls in Pipeline tab and history in Transaction History tab', async () => {
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    expect(screen.getByRole('button', { name: /complete step 4/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /needs another observation \(repeat step 4\)/i }),
    ).toBeInTheDocument();

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
    expect(screen.getByText('Session must be scheduled first')).toBeInTheDocument();
    expect(screen.getByText(/requires scheduled session before completion/i)).toBeInTheDocument();
    expect(screen.getAllByText('Assigned To').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Session Date & Time').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /select sunday date & time/i })).toBeInTheDocument();

    // Verify Complete Step button is disabled
    const completeBtn = screen.getByRole('button', { name: /complete step 2/i });
    expect(completeBtn).toBeDisabled();
  });

  it('disables Complete Step button when session fields are filled but session has not been scheduled yet', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    mockDetailQuery.mockReturnValue({
      data: {
        application: { ...mockApplication, current_step: 2 },
        // Step 2 has no transaction scheduled yet
        transactions: [],
        step_notes: [
          {
            id: 'note-1',
            application_id: mockApplication.id,
            step_number: 2,
            author_user_id: 'user-1',
            author_name: 'Lead Reviewer',
            notes: 'Feedback recorded',
            created_at: '2026-11-01T10:00:00+08:00',
          },
        ],
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

    // Pick reviewer
    const reviewerSearchInput = screen.getByPlaceholderText(/search coach|search user/i);
    await user.click(reviewerSearchInput);
    const reviewerOption = screen.getByText('Test Lead Usher');
    await user.click(reviewerOption);

    // Pick Sunday date & time
    const dateTrigger = screen.getByRole('button', { name: /select sunday date & time/i });
    await user.click(dateTrigger);
    const popover = screen.getByRole('dialog', { name: /select sunday session date/i });
    const sundayBtn = within(popover).getByRole('button', {
      name: /Sunday, November 8/i,
    });
    await user.click(sundayBtn);
    await user.click(within(popover).getByRole('button', { name: 'Done' }));

    // Reviewer and Date are set, Note exists, but session is NOT saved yet
    expect(screen.getByText('Session must be scheduled first')).toBeInTheDocument();
    const completeBtn = screen.getByRole('button', { name: /complete step 2/i });
    expect(completeBtn).toBeDisabled();

    // Save Schedule button is enabled with prominent text
    const saveScheduleBtn = screen.getByRole('button', { name: /save schedule/i });
    expect(saveScheduleBtn).toBeEnabled();
  });

  it('allows scheduling session with date/time and blank coach', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    mockDetailQuery.mockReturnValue({
      data: {
        application: { ...mockApplication, current_step: 2 },
        transactions: [],
        step_notes: [],
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

    // Save schedule button should be disabled when date is not set
    const saveScheduleBtn = screen.getByRole('button', { name: /save schedule/i });
    expect(saveScheduleBtn).toBeDisabled();

    // Select Sunday date & time (leaving coach blank)
    const dateTrigger = screen.getByRole('button', { name: /select sunday date & time/i });
    await user.click(dateTrigger);
    const popover = screen.getByRole('dialog', { name: /select sunday session date/i });
    const sundayBtn = within(popover).getByRole('button', {
      name: /Sunday, November 8/i,
    });
    await user.click(sundayBtn);
    await user.click(within(popover).getByRole('button', { name: 'Done' }));

    // Now Save Schedule button is enabled even though reviewer is blank!
    expect(saveScheduleBtn).toBeEnabled();
    await user.click(saveScheduleBtn);

    // Confirm dialog should open and display the Unassigned badge
    expect(screen.getByText('Confirm Session Schedule')).toBeInTheDocument();
    expect(screen.getByText(/Unassigned \(Assign on service day\)/i)).toBeInTheDocument();

    // Confirm scheduling
    const confirmBtn = screen.getByRole('button', { name: /confirm & schedule/i });
    await user.click(confirmBtn);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update_stage',
        status: 'scheduled',
        step_number: 2,
        assigned_reviewer_id: null,
        assigned_reviewer_name: null,
      }),
      expect.any(Object),
    );
  });

  it('displays unassigned badge on scheduled session and blocks completion until coach is assigned', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const scheduledUnassignedTx: RecruitmentPipelineTransaction = {
      ...mockTransaction,
      id: 'tx-scheduled-unassigned',
      step_number: 2,
      status: 'scheduled',
      transaction_type: 'scheduled',
      scheduled_at: '2026-11-08T09:00:00+08:00',
      assigned_reviewer_id: null,
      assigned_reviewer_name: null,
    };

    mockDetailQuery.mockReturnValue({
      data: {
        application: { ...mockApplication, current_step: 2 },
        transactions: [scheduledUnassignedTx],
        step_notes: [],
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

    // Notice should show unassigned badge
    expect(screen.getAllByText(/Unassigned \(Assign on service day\)/i).length).toBeGreaterThan(0);

    // Complete Step button must be disabled because coach is still unassigned
    const completeBtn = screen.getByRole('button', { name: /complete step 2/i });
    expect(completeBtn).toBeDisabled();
    expect(screen.getByText(/Required before completing Step 2/i)).toBeInTheDocument();
    expect(screen.getAllByText('Assigned To').length).toBeGreaterThan(0);

    // Now assign a coach on service day
    const reviewerSearchInput = screen.getByPlaceholderText(/search coach|search user/i);
    await user.click(reviewerSearchInput);
    const reviewerOption = screen.getByText('Test Lead Usher');
    await user.click(reviewerOption);

    // Now Complete Step button should be enabled!
    expect(completeBtn).toBeEnabled();
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

    const commentInput = screen.getByLabelText(/completion notes \/ feedback/i);
    await user.type(commentInput, 'Passed interview evaluation');

    const confirmCompleteBtn = screen.getByRole('button', { name: /confirm & complete step 2/i });
    await user.click(confirmCompleteBtn);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        step_number: 2,
        status: 'completed',
        notes: 'Passed interview evaluation',
      }),
      expect.any(Object),
    );
  });

  it('allows cancelling a scheduled session, requiring a cancellation reason and submitting cancel_schedule action', async () => {
    const user = userEvent.setup();
    const readyStep2Tx: RecruitmentPipelineTransaction = {
      ...mockTransaction,
      id: 'tx-ready-step-2',
      step_number: 2,
      status: 'scheduled',
      transaction_type: 'scheduled',
      scheduled_at: '2026-11-08T09:00:00+08:00',
      assigned_reviewer_id: 'rev-1',
      assigned_reviewer_name: 'Aaron Atienza (Aey)',
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

    const cancelScheduleBtn = screen.getByRole('button', { name: /cancel schedule/i });
    expect(cancelScheduleBtn).toBeInTheDocument();
    await user.click(cancelScheduleBtn);

    // Verify Cancel Schedule confirmation modal
    expect(screen.getByText('Cancel Scheduled Session')).toBeInTheDocument();
    expect(screen.getByText('To Be Cancelled')).toBeInTheDocument();

    const confirmCancelBtn = screen.getByRole('button', { name: /confirm & cancel schedule/i });
    expect(confirmCancelBtn).toBeDisabled();

    const reasonInput = screen.getByLabelText(/cancellation reason/i);
    await user.type(reasonInput, 'Applicant has scheduling conflict');
    expect(confirmCancelBtn).toBeEnabled();

    await user.click(confirmCancelBtn);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'cancel_schedule',
        step_number: 2,
        notes: 'Applicant has scheduling conflict',
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

    // Verify recorded reviewer and notes can be viewed via the notes chip
    expect(screen.getAllByText('Test Pastor Dave').length).toBeGreaterThan(0);
    const notesChip = screen.getByRole('button', { name: /notes \(1\)/i });
    expect(notesChip).toBeInTheDocument();
    await user.click(notesChip);
    expect(
      screen.getByText('Candidate showed great heart for welcoming guests and solid doctrine.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Great meeting you! Looking forward to your orientation.'),
    ).not.toBeInTheDocument();

    // Verify action buttons are hidden since step is already completed
    expect(screen.queryByRole('button', { name: /complete step 2/i })).not.toBeInTheDocument();
  });

  it('displays previous interview attempts intact when an interview is repeated', async () => {
    const user = userEvent.setup();
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

    // Verify Past Attempts chip is displayed
    const viewPastAttemptsBtn = screen.getByRole('button', {
      name: /past attempts \(1\)/i,
    });
    expect(viewPastAttemptsBtn).toBeInTheDocument();

    // Click to open attempts history dialog
    await user.click(viewPastAttemptsBtn);

    // Verify dialog content contains Attempt #1 data intact
    expect(screen.getByText('Previous Interview Attempts (1)')).toBeInTheDocument();
    expect(screen.getByText('Recorded History Intact')).toBeInTheDocument();
    expect(
      screen.getAllByText(
        'Initial interview: Candidate requested more time to discuss availability with family.',
      ).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Test Pastor Dave').length).toBeGreaterThanOrEqual(1);

    // Close dialog
    const attemptsDialog = screen.getByRole('dialog', { name: /previous interview attempts/i });
    const closeDialogBtn = within(attemptsDialog).getByRole('button', { name: /^close$/i });
    await user.click(closeDialogBtn);

    // Verify current session indicates Attempt #2
    expect(screen.getByText('Attempt #2')).toBeInTheDocument();

    // Verify Repeat Interview button is rendered on Step 2
    const repeatButton = screen.getByRole('button', {
      name: /needs another interview \(repeat step 2\)/i,
    });
    expect(repeatButton).toBeInTheDocument();
  });

  it('triggers return_to_interview when returning candidate from Step 3 to Step 2', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const activeStep3Application: RecruitmentApplication = {
      ...mockApplication,
      current_step: 3,
    };

    const mockStep3Tx: RecruitmentPipelineTransaction = {
      id: 'tx-sched-3',
      application_id: mockApplication.id,
      step_number: 3,
      step_key: 'orientation',
      from_step: 2,
      to_step: 3,
      transaction_type: 'scheduled',
      status: 'scheduled',
      attempt_number: 1,
      assigned_reviewer_id: 'user-oic-1',
      assigned_reviewer_name: 'Test Paul Apostle (Test OIC Paul)',
      scheduled_at: '2026-11-08T09:00:00+08:00',
      completed_at: null,
      rubric_data: {},
      notes: 'Initial orientation scheduled.',
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

    // Step 3 should display "Needs Another Interview (Return to Step 2)" button
    const returnButton = screen.getByRole('button', {
      name: /needs another interview \(return to step 2\)/i,
    });
    expect(returnButton).toBeInTheDocument();

    await user.click(returnButton);

    // Verify confirmation dialog opens directly with details before submitting mutation
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

  it('triggers return_to_observation when returning candidate from Step 5 to Step 4', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const activeStep5Application: RecruitmentApplication = {
      ...mockApplication,
      current_step: 5,
    };

    const mockStep5Tx: RecruitmentPipelineTransaction = {
      id: 'tx-eval-5',
      application_id: mockApplication.id,
      step_number: 5,
      step_key: 'evaluation',
      attempt_number: 1,
      transaction_type: 'scheduled',
      status: 'scheduled',
      from_step: 4,
      to_step: 5,
      scheduled_at: '2026-11-22T10:00:00+08:00',
      assigned_reviewer_id: 'user-lead-1',
      assigned_reviewer_name: 'Test Lead Usher',
      completed_at: null,
      rubric_data: {},
      notes: 'Initial evaluation scheduled.',
      applicant_visible_notes: null,
      created_by_user_id: 'user-1',
      created_at: '2026-11-15T10:00:00+08:00',
    };

    mockDetailQuery.mockReturnValue({
      data: {
        application: activeStep5Application,
        transactions: [mockStep5Tx],
      },
      isLoading: false,
      isError: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={activeStep5Application}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Step 5 should display "Needs Another Observation (Return to Step 4)" button
    const returnButton = screen.getByRole('button', {
      name: /needs another observation \(return to step 4\)/i,
    });
    expect(returnButton).toBeInTheDocument();

    await user.click(returnButton);

    // Verify confirmation dialog opens directly with details before submitting mutation
    expect(screen.getByText('Confirm Return to Observation Schedule')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /confirm & return to observation/i,
    });
    await user.click(confirmButton);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'return_to_observation',
        step_number: 5,
      }),
      expect.any(Object),
    );
  });

  it('allows returning to Step 4 directly when viewing completed Step 4 while candidate is on Step 5', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const activeStep5Application: RecruitmentApplication = {
      ...mockApplication,
      current_step: 5,
    };

    const mockStep4Tx: RecruitmentPipelineTransaction = {
      id: 'tx-obs-4',
      application_id: mockApplication.id,
      step_number: 4,
      step_key: 'observation',
      attempt_number: 1,
      transaction_type: 'completed',
      status: 'completed',
      from_step: 3,
      to_step: 4,
      scheduled_at: '2026-11-15T10:00:00+08:00',
      assigned_reviewer_id: 'user-lead-1',
      assigned_reviewer_name: 'Test Lead Usher',
      completed_at: '2026-11-15T12:00:00+08:00',
      rubric_data: {},
      notes: 'Initial observation completed.',
      applicant_visible_notes: null,
      created_by_user_id: 'user-1',
      created_at: '2026-11-08T10:00:00+08:00',
    };

    mockDetailQuery.mockReturnValue({
      data: {
        application: activeStep5Application,
        transactions: [mockStep4Tx],
      },
      isLoading: false,
      isError: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={activeStep5Application}
        isOpen={true}
        onClose={onClose}
      />,
    );

    // Navigate to Step 4 in stepper
    const step4Tab = screen.getByRole('tab', { name: /observation/i });
    await user.click(step4Tab);

    // Verify Return to Step 4 banner and button are rendered
    expect(screen.getByText('Return Candidate to Step 4 (Observation)')).toBeInTheDocument();
    const returnToStep4Btn = screen.getByRole('button', { name: 'Return to Step 4' });
    await user.click(returnToStep4Btn);

    // Verify confirmation dialog opens
    expect(screen.getByText('Confirm Return to Observation Schedule')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', {
      name: /confirm & return to observation/i,
    });
    await user.click(confirmButton);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'return_to_observation',
        step_number: 4,
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

    const updateScheduleBtn = screen.getByRole('button', {
      name: /update schedule/i,
    });
    expect(updateScheduleBtn).toBeInTheDocument();

    await user.click(updateScheduleBtn);

    // Confirmation modal should be visible
    expect(screen.getByText('Confirm Session Reschedule')).toBeInTheDocument();
    expect(screen.getAllByText('Test Paul Apostle (Test OIC Paul)').length).toBeGreaterThanOrEqual(
      1,
    );

    // Cancel closes dialog without mutation
    const cancelBtn = screen.getByRole('button', { name: /^cancel$/i });
    await user.click(cancelBtn);
    expect(mockUpdateStageMutate).not.toHaveBeenCalled();

    // Reopen and confirm reschedule
    await user.click(updateScheduleBtn);
    expect(screen.getByText('Confirm Session Reschedule')).toBeInTheDocument();
    const confirmRescheduleBtn = screen.getByRole('button', { name: /confirm & reschedule/i });
    await user.click(confirmRescheduleBtn);

    // Rescheduling must update in place with action: update_stage and NOT repeat_step
    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update_stage',
        step_number: 4,
        status: 'scheduled',
      }),
      expect.any(Object),
    );
  });

  it('triggers repeat_step when clicking Needs Another Observation on Step 4', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    const activeStep4Application: RecruitmentApplication = {
      ...mockApplication,
      current_step: 4,
    };

    const mockStep4Tx: RecruitmentPipelineTransaction = {
      id: 'tx-obs-4',
      application_id: mockApplication.id,
      step_number: 4,
      step_key: 'observation',
      attempt_number: 1,
      transaction_type: 'scheduled',
      status: 'scheduled',
      from_step: 3,
      to_step: 4,
      scheduled_at: '2026-11-15T09:00:00+08:00',
      assigned_reviewer_id: 'user-oic-1',
      assigned_reviewer_name: 'Test Paul Apostle (Test OIC Paul)',
      completed_at: null,
      rubric_data: {},
      notes: 'First observation session scheduled.',
      applicant_visible_notes: null,
      created_by_user_id: 'user-1',
      created_at: '2026-11-08T10:00:00+08:00',
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

    const repeatStepBtn = screen.getByRole('button', {
      name: /needs another observation \(repeat step 4\)/i,
    });
    expect(repeatStepBtn).toBeInTheDocument();

    await user.click(repeatStepBtn);

    // Verify confirmation modal opens with Re-Observation schedule details
    expect(screen.getByText('Confirm Re-Observation Schedule')).toBeInTheDocument();
    expect(
      screen.getByText(
        'A new attempt session will be scheduled while preserving candidate pipeline history.',
      ),
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /confirm & schedule re-observation/i });
    await user.click(confirmBtn);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'repeat_step',
        step_number: 4,
        status: 'scheduled',
      }),
      expect.any(Object),
    );
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
    expect(screen.queryByText('Endorsed')).not.toBeInTheDocument();
  });

  it('opens recruiter notes dialog when clicking Open Notes and adds a note', async () => {
    const user = userEvent.setup();
    mockDetailQuery.mockReturnValue({
      data: {
        application: mockApplication,
        transactions: [mockTransaction],
        step_notes: [
          {
            id: 'note-1',
            application_id: mockApplication.id,
            step_number: 4,
            attempt_number: 1,
            author_id: 'user-oic-1',
            author_name: 'Test Paul Apostle',
            author_role: 'OIC',
            avatar_object_key: null,
            content: 'Candidate arrived on time and showed great energy.',
            created_at: '2026-11-08T10:00:00+08:00',
          },
        ],
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

    const openNotesBtn = screen.getByRole('button', { name: /notes \(1\)/i });
    expect(openNotesBtn).toBeInTheDocument();
    await user.click(openNotesBtn);

    // Dialog is visible and displays the recorded note
    const notesDialog = screen.getByRole('dialog', { name: /recruiter notes — step 4/i });
    expect(notesDialog).toBeInTheDocument();
    expect(
      within(notesDialog).getByText('Candidate arrived on time and showed great energy.'),
    ).toBeInTheDocument();

    // Type new note
    const textarea = within(notesDialog).getByPlaceholderText(/type internal feedback/i);
    await user.type(textarea, 'Follow-up check completed successfully.');

    const addNoteBtn = within(notesDialog).getByRole('button', { name: /add note/i });
    await user.click(addNoteBtn);

    expect(mockAddRecruiterNoteMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        application_id: mockApplication.id,
        step_number: 4,
        content: 'Follow-up check completed successfully.',
      }),
      expect.any(Object),
    );

    // Close notes dialog
    const closeBtn = within(notesDialog).getByRole('button', { name: /^close$/i });
    await user.click(closeBtn);
  });
});
