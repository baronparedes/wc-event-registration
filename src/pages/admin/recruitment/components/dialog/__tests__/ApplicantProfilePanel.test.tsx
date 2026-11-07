import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecruitmentApplication } from '@/lib/domain/recruitment';

import { ApplicantProfilePanel } from '../ApplicantProfilePanel';

const useAdminAuthQueryMock = vi.fn();
vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => useAdminAuthQueryMock(),
}));

const mutateAsyncMock = vi.fn();
vi.mock('@/hooks/domain/recruitment/mutations/useUpdateRecruitmentStageMutation', () => ({
  useUpdateRecruitmentStageMutation: () => ({
    mutateAsync: mutateAsyncMock,
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/domain/recruitment/mutations/useUploadRecruitmentAvatarMutation', () => ({
  useUploadRecruitmentAvatarMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/domain/members/queries/useMemberAvatarQuery', () => ({
  useMemberAvatarQuery: () => ({
    data: null,
    isLoading: false,
  }),
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
  date_of_birth: '1998-08-20',
  gender: 'Female',
  life_stage: 'Single',
  avatar_object_key: null,
  desired_role: 'Usher',
  confirmed_role: null,
  personal_details: {
    occupation: 'Teacher',
    company_name: 'Elementary School',
    wedding_anniversary: null,
  },
  emergency_contact: {
    name: 'Test Father',
    phone: '09187654321',
    relation: 'Father',
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

describe('ApplicantProfilePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAdminAuthQueryMock.mockReturnValue({
      data: { adminRole: 'admin' },
      can: (perm: string) => perm === 'canWriteAdminData',
    });
  });

  it('renders "Edit Details" button when user has write access and applicant is not deployed', () => {
    render(<ApplicantProfilePanel application={mockApplication} />);

    expect(screen.getByRole('button', { name: /edit details/i })).toBeInTheDocument();
  });

  it('opens EditApplicantDetailsDialog when "Edit Details" button is clicked', async () => {
    const user = userEvent.setup();
    render(<ApplicantProfilePanel application={mockApplication} />);

    const editButton = screen.getByRole('button', { name: /edit details/i });
    await user.click(editButton);

    expect(screen.getByRole('heading', { name: /edit applicant details/i })).toBeInTheDocument();
  });

  it('hides "Edit Details" button when applicant is deployed', () => {
    render(
      <ApplicantProfilePanel
        application={{
          ...mockApplication,
          status: 'deployed',
        }}
      />,
    );

    expect(screen.queryByRole('button', { name: /edit details/i })).not.toBeInTheDocument();
  });

  it('hides "Edit Details" button when user lacks write permission', () => {
    useAdminAuthQueryMock.mockReturnValue({
      data: { adminRole: 'admin_viewer' },
      can: () => false,
    });

    render(<ApplicantProfilePanel application={mockApplication} />);

    expect(screen.queryByRole('button', { name: /edit details/i })).not.toBeInTheDocument();
  });
});
