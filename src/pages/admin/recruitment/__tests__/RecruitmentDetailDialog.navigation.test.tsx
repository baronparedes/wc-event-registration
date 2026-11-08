import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecruitmentApplicantDetailDialog } from '../components/dialog/RecruitmentApplicantDetailDialog';
import { mockApplication, mockTransaction, renderDialog } from './testDetailDialogHelpers';

const { mockDetailQuery, mockUpdateStageMutate, mockDeployApplicantMutate, mockNavigate } =
  vi.hoisted(() => ({
    mockDetailQuery: vi.fn(),
    mockUpdateStageMutate: vi.fn(),
    mockDeployApplicantMutate: vi.fn(),
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
    mutate: vi.fn(),
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

describe('RecruitmentDetailDialog - Navigation & Profile Tabs', () => {
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

  it('hides resend endorsement email button in profile tab when applicant is endorsed', async () => {
    const endorsedApp = {
      ...mockApplication,
      dgroup_approval_id: 'appr-1',
    };
    mockDetailQuery.mockReturnValue({
      data: {
        application: endorsedApp,
        transactions: [mockTransaction],
        dgroup_endorsement: {
          approval_id: 'appr-1',
          status: 'approved',
        },
      },
      isLoading: false,
    });

    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={endorsedApp}
        isOpen={true}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /applicant profile/i }));

    expect(screen.getByText('Endorsed')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Resend Endorsement Email/i }),
    ).not.toBeInTheDocument();
  });

  it('renders Change Leader button in profile tab when pending and opens action dialog', async () => {
    mockDetailQuery.mockReturnValue({
      data: {
        application: mockApplication,
        transactions: [mockTransaction],
        dgroup_endorsement: {
          approval_id: 'appr-1',
          status: 'pending',
        },
      },
      isLoading: false,
    });

    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /applicant profile/i }));

    const changeBtn = screen.getByRole('button', { name: /change leader/i });
    expect(changeBtn).toBeInTheDocument();

    await user.click(changeBtn);
    expect(screen.getByRole('heading', { name: /change dgroup leader/i })).toBeInTheDocument();
  });

  it('renders Request Endorsement Again button in profile tab when declined and opens action dialog', async () => {
    mockDetailQuery.mockReturnValue({
      data: {
        application: mockApplication,
        transactions: [mockTransaction],
        dgroup_endorsement: {
          approval_id: 'appr-1',
          status: 'rejected',
          decision_notes: 'Needs more discipleship.',
        },
      },
      isLoading: false,
    });

    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={mockApplication}
        isOpen={true}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /applicant profile/i }));

    const reRequestBtn = screen.getByRole('button', { name: /request endorsement again/i });
    expect(reRequestBtn).toBeInTheDocument();

    await user.click(reRequestBtn);
    expect(screen.getByRole('heading', { name: /request endorsement again/i })).toBeInTheDocument();
  });

  it('hides resend endorsement email button in profile tab when applicant is deployed', async () => {
    const deployedApp = {
      ...mockApplication,
      status: 'deployed' as const,
    };
    mockDetailQuery.mockReturnValue({
      data: {
        application: deployedApp,
        transactions: [mockTransaction],
      },
      isLoading: false,
    });

    const user = userEvent.setup();
    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={deployedApp}
        isOpen={true}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByRole('tab', { name: /applicant profile/i }));

    expect(
      screen.queryByRole('button', { name: /Resend Endorsement Email/i }),
    ).not.toBeInTheDocument();
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

    const user = userEvent.setup();
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
    expect(screen.getByText('Endorsed')).toBeInTheDocument();
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

  it('does not display the Archive button when applicant is deployed', () => {
    const deployedApp = {
      ...mockApplication,
      status: 'deployed' as const,
      current_step: 9 as const,
    };
    mockDetailQuery.mockReturnValue({
      data: {
        application: deployedApp,
        transactions: [mockTransaction],
      },
      isLoading: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog
        application={deployedApp}
        isOpen={true}
        onClose={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: /^archive$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /restore to active/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^close$/i })).toBeInTheDocument();
  });
});
