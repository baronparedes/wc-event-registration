import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecruitmentApplication } from '@/lib/domain/recruitment';

import { EditApplicantDetailsDialog } from '../EditApplicantDetailsDialog';

const mutateAsyncMock = vi.fn();
vi.mock('@/hooks/domain/recruitment/mutations/useUpdateRecruitmentStageMutation', () => ({
  useUpdateRecruitmentStageMutation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const mockApplication: RecruitmentApplication = {
  id: '00000000-0000-0000-0000-000000000001',
  auth_user_id: null,
  email: 'test.applicant@example.com',
  first_name: 'Test First',
  middle_name: 'Test Middle',
  last_name: 'Test Last',
  full_name: 'Test First Test Middle Test Last',
  nickname: 'Test Nickname',
  phone: '09171234567',
  date_of_birth: '1995-05-15',
  gender: 'Male',
  life_stage: 'Single',
  avatar_object_key: null,
  desired_role: 'Usher',
  confirmed_role: null,
  personal_details: {
    occupation: 'Software Engineer',
    company_name: 'Tech Corp',
    wedding_anniversary: null,
  },
  emergency_contact: {
    name: 'Test Mother',
    phone: '09187654321',
    relation: 'Mother',
  },
  application_history: {
    is_first_time_applicant: true,
  },
  spiritual_background: {
    ccf_member_since: '2020 Jan',
    glc1_status: 'Completed',
    glc2_status: 'Ongoing',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2021 Mar',
    leader_name: 'Test Leader',
    leader_email: 'leader@example.com',
    leader_phone: '09191112233',
    is_dgroup_leader: false,
  },
  applicant_attested_at: '2026-03-01T08:00:00Z',
  survey_answers: {},
  survey_score: 10,
  survey_total: 10,
  current_step: 3,
  status: 'active',
  dgroup_approval_id: null,
  vmt_registered: false,
  ccf_vmt_id: null,
  ccf_vmt_date: null,
  vmt_registered_at: null,
  vmt_verified_by: null,
  service_commitments: {
    first_sunday: undefined,
    second_sunday: undefined,
    third_sunday: undefined,
    fourth_sunday: undefined,
    fifth_sunday: undefined,
  },
  assigned_rfid_member_id: null,
  promoted_user_id: null,
  deployed_at: null,
  created_at: '2026-03-01T08:00:00Z',
  updated_at: '2026-03-01T08:00:00Z',
};

describe('EditApplicantDetailsDialog', () => {
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders prefilled form fields with application data', () => {
    render(
      <EditApplicantDetailsDialog
        isOpen={true}
        onClose={onCloseMock}
        application={mockApplication}
      />,
    );

    expect(screen.getByRole('heading', { name: /edit applicant details/i })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test First')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Middle')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Last')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Nickname')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test.applicant@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09171234567')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1995-05-15')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Software Engineer')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Tech Corp')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Mother')).toBeInTheDocument();
    expect(screen.getByDisplayValue('09187654321')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Mother')).toBeInTheDocument();
  });

  it('submits updated values and closes on success', async () => {
    const user = userEvent.setup();
    mutateAsyncMock.mockResolvedValueOnce({ success: true });

    render(
      <EditApplicantDetailsDialog
        isOpen={true}
        onClose={onCloseMock}
        application={mockApplication}
      />,
    );

    const nicknameInput = screen.getByDisplayValue('Test Nickname');
    await user.clear(nicknameInput);
    await user.type(nicknameInput, 'Test Updated');

    const emailInput = screen.getByDisplayValue('test.applicant@example.com');
    await user.clear(emailInput);
    await user.type(emailInput, 'test.updated@example.com');

    const form = document.querySelector('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'update_profile',
          application_id: mockApplication.id,
          profile: expect.objectContaining({
            first_name: 'Test First',
            nickname: 'Test Updated',
            email: 'test.updated@example.com',
          }),
        }),
      );
      expect(toastSuccessMock).toHaveBeenCalledWith('Applicant details updated successfully');
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it('renders wedding anniversary when life stage is Married', async () => {
    render(
      <EditApplicantDetailsDialog
        isOpen={true}
        onClose={onCloseMock}
        application={{
          ...mockApplication,
          life_stage: 'Single',
        }}
      />,
    );

    expect(screen.queryByLabelText(/wedding anniversary/i)).not.toBeInTheDocument();

    const lifeStageButton = screen.getByRole('button', { name: 'Single' });
    fireEvent.click(lifeStageButton);

    const marriedOption = screen.getByRole('option', { name: 'Married' });
    fireEvent.click(marriedOption);

    await waitFor(() => {
      expect(screen.getByLabelText(/wedding anniversary/i)).toBeInTheDocument();
    });
  });
});
