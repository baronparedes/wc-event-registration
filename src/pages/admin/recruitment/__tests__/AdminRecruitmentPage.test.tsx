import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecruitmentApplication } from '@/lib/domain/recruitment';

import { AdminRecruitmentPage } from '../index';

const mockApplication: RecruitmentApplication = {
  id: 'app-uuid-1',
  auth_user_id: null,
  email: 'maria.santos@example.com',
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
    company_name: 'Audit Co',
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
    ccf_member_since: '2019 Jan',
    other_ministries: null,
    glc1_status: 'Completed',
    glc2_status: 'Completed',
  },
  dgroup_info: {
    is_constant_attendee: true,
    member_since: '2018 Jun',
    leader_name: 'Test Grace Leader',
    leader_email: 'grace@example.com',
    leader_phone: '09191234567',
    is_dgroup_leader: false,
    leader_since: null,
    dgroup_member_count: null,
  },
  applicant_attested_at: '2026-11-01T10:00:00+08:00',
  survey_answers: { survey_q1: 'true' },
  survey_score: 19,
  survey_total: 20,
  current_step: 3,
  status: 'active',
  dgroup_approval_id: 'approval-1',
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

vi.mock('@/hooks/domain/recruitment', () => ({
  useAdminRecruitmentApplicationsInfiniteQuery: () => ({
    data: {
      pages: [
        {
          items: [mockApplication],
          totalCount: 1,
          hasMore: false,
          nextCursor: null,
          totalPages: 1,
        },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
  }),
  useAdminRecruitmentApplicationDetailQuery: () => ({
    data: {
      application: mockApplication,
      transactions: [],
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
      survey_questions: [],
    },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => ({
    can: () => true,
    user: { id: 'admin-1' },
    adminRole: 'admin',
    isAuthenticated: true,
  }),
  useApproverUsersQuery: () => ({
    data: [{ auth_user_id: 'user-1', name: 'Test Pastor John', role: 'admin' }],
  }),
}));

function renderWithRouter(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminRecruitmentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders applicant in desktop table with avatar and details', () => {
    renderWithRouter(<AdminRecruitmentPage />);

    expect(screen.getByText('Test Maria Santos (Test Mars)')).toBeInTheDocument();
    expect(screen.getByText('maria.santos@example.com')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
    expect(screen.getByText('19 / 20')).toBeInTheDocument();
  });

  it('opens review dialog when Review button is clicked', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminRecruitmentPage />);

    const reviewButton = screen.getByRole('button', { name: /review/i });
    await user.click(reviewButton);

    // Dialog title should appear
    expect(
      screen.getByRole('heading', { name: 'Test Maria Santos (Test Mars)' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /9-step pipeline/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /biblical survey/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /applicant profile/i })).toBeInTheDocument();
  });

  it('renders status filter tabs and switches tab on click', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminRecruitmentPage />);

    const activeTab = screen.getByRole('tab', { name: /^active$/i });
    const deployedTab = screen.getByRole('tab', { name: /^deployed$/i });

    expect(activeTab).toHaveAttribute('aria-selected', 'true');
    expect(deployedTab).toHaveAttribute('aria-selected', 'false');

    await user.click(deployedTab);
    expect(deployedTab).toHaveAttribute('aria-selected', 'true');
    expect(activeTab).toHaveAttribute('aria-selected', 'false');
  });
});
