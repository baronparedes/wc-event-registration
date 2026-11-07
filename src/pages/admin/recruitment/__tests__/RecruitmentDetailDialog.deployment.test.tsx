import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecruitmentApplication, RecruitmentServiceSlot } from '@/lib/domain/recruitment';

import { RecruitmentApplicantDetailDialog } from '../components/dialog/RecruitmentApplicantDetailDialog';
import { mockApplication, renderDialog } from './testDetailDialogHelpers';

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
      survey_questions: [],
    },
    isLoading: false,
  }),
  useReviewerUsersQuery: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
  }),
  useReviewerUserByIdQuery: () => ({
    data: null,
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

describe('RecruitmentDetailDialog - Step 8 RFID Commitments & Step 9 Deployment', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows selecting Sunday commitments and assigning RFID at Step 8, passing commitments to mutation', async () => {
    const user = userEvent.setup();
    const step8App: RecruitmentApplication = {
      ...mockApplication,
      current_step: 8,
      assigned_rfid_member_id: null,
      service_commitments: {},
    };

    mockDetailQuery.mockReturnValue({
      data: {
        application: step8App,
        transactions: [],
      },
      isLoading: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog application={step8App} isOpen={true} onClose={onClose} />,
    );

    // Verify requirements banner is displayed
    expect(screen.getByText(/Required before completing Step 8/i)).toBeInTheDocument();
    expect(screen.getByText('Assigned Physical RFID Tag')).toBeInTheDocument();
    expect(screen.getByText('At least one committed Sunday service slot')).toBeInTheDocument();

    const completeBtn = screen.getByRole('button', {
      name: /save commitments, assign rfid & complete step 8/i,
    });
    expect(completeBtn).toBeDisabled();

    // Toggle 1st Sunday 9AM switch
    const firstSun9amSwitch = screen.getByRole('switch', {
      name: 'Toggle First Sunday at 9AM',
    });
    await user.click(firstSun9amSwitch);

    // Type RFID tag
    const rfidInput = screen.getByLabelText(/assigned physical rfid tag/i);
    await user.type(rfidInput, 'RFID-9988');

    // Requirements banner should disappear and button enabled
    expect(screen.queryByText(/Required before completing Step 8/i)).not.toBeInTheDocument();
    expect(completeBtn).toBeEnabled();

    // Click Complete Step 8 button to open confirmation dialog
    await user.click(completeBtn);
    expect(screen.getByText('Confirm Step 8 Completion')).toBeInTheDocument();
    expect(screen.getByText('RFID-9988')).toBeInTheDocument();
    expect(screen.getByText('Committed Sunday Schedule')).toBeInTheDocument();

    // Confirm completion
    const confirmBtn = screen.getByRole('button', { name: /confirm & complete step 8/i });
    await user.click(confirmBtn);

    expect(mockUpdateStageMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'update_stage',
        step_number: 8,
        status: 'completed',
        assigned_rfid_member_id: 'RFID-9988',
        service_commitments: expect.objectContaining({
          first_sunday: ['9AM'],
        }),
      }),
      expect.anything(),
    );
  });

  it('renders Step 9 Final Deployment with confirmed Sunday commitments and triggers deployment mutation', async () => {
    const user = userEvent.setup();
    const step9App = {
      ...mockApplication,
      current_step: 9 as const,
      assigned_rfid_member_id: 'RFID-9988',
      service_commitments: {
        first_sunday: ['9AM', '12NN'] as RecruitmentServiceSlot[],
        second_sunday: [],
        third_sunday: ['3PM'] as RecruitmentServiceSlot[],
        fourth_sunday: [],
        fifth_sunday: [],
      },
    };

    mockDetailQuery.mockReturnValue({
      data: {
        application: step9App,
        transactions: [],
      },
      isLoading: false,
    });

    renderDialog(
      <RecruitmentApplicantDetailDialog application={step9App} isOpen={true} onClose={onClose} />,
    );

    expect(
      screen.getByText('Ready for final deployment into Welcome Center membership'),
    ).toBeInTheDocument();
    expect(screen.getByText('RFID-9988')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Sunday Availability' })).toBeInTheDocument();
    expect(screen.getByText('Committed volunteer schedule for deployment.')).toBeInTheDocument();

    const deployBtn = screen.getByRole('button', {
      name: /deploy volunteer to welcome center/i,
    });
    expect(deployBtn).toBeInTheDocument();

    await user.click(deployBtn);

    expect(screen.getByText('Confirm Volunteer Deployment')).toBeInTheDocument();
    expect(screen.getAllByText('RFID-9988').length).toBeGreaterThan(0);
    expect(screen.getAllByText('9AM, 12NN').length).toBeGreaterThan(0);

    mockDeployApplicantMutate.mockImplementation(
      (_id: string, options?: { onSuccess?: (data: { user_id: string }) => void }) => {
        options?.onSuccess?.({ user_id: 'deployed-user-456' });
      },
    );

    const confirmDeployBtn = screen.getByRole('button', {
      name: /confirm & deploy volunteer/i,
    });
    await user.click(confirmDeployBtn);

    expect(mockDeployApplicantMutate).toHaveBeenCalledWith(
      'app-123',
      expect.objectContaining({
        onSuccess: expect.any(Function),
      }),
    );
    expect(mockNavigate).toHaveBeenCalledWith('/admin/members/deployed-user-456');
  });
});
