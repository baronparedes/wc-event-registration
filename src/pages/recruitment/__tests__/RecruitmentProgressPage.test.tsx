import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecruitmentProgressPage } from '../index';

const {
  mockUseRecruitmentApplicationByTokenQuery,
  mockUsePublicRecruitmentConfigQuery,
  mockUseUpdateRecruitmentStageMutation,
} = vi.hoisted(() => ({
  mockUseRecruitmentApplicationByTokenQuery: vi.fn(),
  mockUsePublicRecruitmentConfigQuery: vi.fn(),
  mockUseUpdateRecruitmentStageMutation: vi.fn(),
}));

vi.mock('@/hooks/domain/recruitment', () => ({
  useRecruitmentApplicationByTokenQuery: (...args: unknown[]) =>
    mockUseRecruitmentApplicationByTokenQuery(...args),
  usePublicRecruitmentConfigQuery: () => mockUsePublicRecruitmentConfigQuery(),
  useUpdateRecruitmentStageMutation: () => mockUseUpdateRecruitmentStageMutation(),
}));

function renderPage(initialEntry = '/recruitment?token=test-token-123') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <RecruitmentProgressPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const activeApplication = {
  expired: false as const,
  id: '22222222-2222-4222-8222-222222222222',
  email: 'applicant@example.com',
  first_name: 'Test Taylor',
  last_name: 'Test Member',
  full_name: 'Test Taylor Test Member',
  nickname: 'Test Tay',
  avatar_object_key: null,
  desired_role: 'Usher' as const,
  confirmed_role: 'Usher' as const,
  current_step: 7 as const,
  status: 'active' as const,
  dgroup_approval_status: 'approved',
  dgroup_leader_name: 'Test Casey Leader',
  vmt_registered: false,
  service_commitments: {},
  assigned_rfid_member_id: null,
  deployed_at: null,
  transactions: [],
};

describe('RecruitmentProgressPage', () => {
  const mockMutate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({ data: null });
    mockUseUpdateRecruitmentStageMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
    mockUseRecruitmentApplicationByTokenQuery.mockReturnValue({
      data: activeApplication,
      isLoading: false,
      isError: false,
    });
  });

  it('prompts applicants to open the tracking link when token is missing', () => {
    renderPage('/recruitment');

    expect(
      screen.getByRole('heading', { name: 'Application Tracking Link Required' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Please open the personalized application tracking link sent to your registered email when you submitted your application\./i,
      ),
    ).toBeInTheDocument();
  });

  it('shows expired message when the application link has expired', () => {
    mockUseRecruitmentApplicationByTokenQuery.mockReturnValue({
      data: {
        id: '22222222-2222-4222-8222-222222222222',
        status: 'deployed',
        expired: true,
      },
      isLoading: false,
      isError: false,
    });

    renderPage('/recruitment?token=expired-token');

    expect(screen.getByRole('heading', { name: 'Application Link Expired' })).toBeInTheDocument();
    expect(
      screen.getByText(
        /Your volunteer recruitment process is complete and you have been deployed!/i,
      ),
    ).toBeInTheDocument();
  });

  it('shows token-matched progress and permits the Step 7 self-attestation', () => {
    renderPage('/recruitment?token=test-token-123');

    expect(mockUseRecruitmentApplicationByTokenQuery).toHaveBeenCalledWith('test-token-123');
    expect(screen.getByText('Endorsement: Submitted')).toBeInTheDocument();
    expect(screen.getByText('Skipped (Not Required for Usher)')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CCF VMT Registration' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I Have Completed CCF VMT Registration' }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        action: 'complete_vmt',
        application_id: activeApplication.id,
        token: 'test-token-123',
        override_endorsement_gate: false,
      },
      expect.any(Object),
    );
  });

  it('keeps Prayer Coach onboarding upcoming until the applicant reaches Step 6', () => {
    mockUseRecruitmentApplicationByTokenQuery.mockReturnValue({
      data: { ...activeApplication, current_step: 2, confirmed_role: null },
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Prayer Coach Onboarding' }).parentElement,
    ).toHaveTextContent('Upcoming');
  });

  it('shows a useful error when the application query fails without a message', () => {
    mockUseRecruitmentApplicationByTokenQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: undefined,
    });

    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Unable to load your recruitment application.',
    );
  });

  it('shows pending endorsement actions and orientation instructions', () => {
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: { orientation_instructions: 'Test orientation instructions.' },
    });
    mockUseRecruitmentApplicationByTokenQuery.mockReturnValue({
      data: {
        ...activeApplication,
        current_step: 6,
        dgroup_approval_status: 'pending',
        confirmed_role: 'Prayer Coach',
      },
      isLoading: false,
      isError: false,
    });

    renderPage('/recruitment?token=test-token-123');

    expect(screen.getByText('Endorsement: Pending')).toBeInTheDocument();
    expect(screen.getByText('Test orientation instructions.')).toBeInTheDocument();
    expect(
      screen.getAllByText('Serve one Sunday service as an Usher before Prayer Coach service.'),
    ).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Resend Endorsement Email' }));

    expect(mockMutate).toHaveBeenCalledWith(
      {
        action: 'resend_endorsement',
        application_id: activeApplication.id,
        token: 'test-token-123',
        override_endorsement_gate: false,
      },
      expect.any(Object),
    );
  });

  it('offers the VMT database link when a registration URL is available', () => {
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: { vmt_registration_url: 'https://example.com/vmt' },
    });

    renderPage();

    expect(screen.getByRole('link', { name: /Open CCF VMT Database/ })).toHaveAttribute(
      'href',
      'https://example.com/vmt',
    );
  });

  it('shows deployment details and the applicant service schedule', () => {
    mockUseRecruitmentApplicationByTokenQuery.mockReturnValue({
      data: {
        ...activeApplication,
        confirmed_role: null,
        current_step: 9,
        status: 'deployed',
        dgroup_approval_status: 'rejected',
        assigned_rfid_member_id: 'RFID-123',
        vmt_registered: true,
        service_commitments: { first_sunday: ['9AM'], fourth_sunday: ['3PM'] },
      },
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(
      screen.getByRole('heading', { name: 'Welcome to the Welcome Center team' }),
    ).toBeVisible();
    expect(screen.getByText('You are deployed as Usher.')).toBeInTheDocument();
    expect(screen.getByText('Assigned RFID: RFID-123')).toBeInTheDocument();
    expect(
      screen.getByText('Sunday schedule: 1st Sunday: 9AM, 4th Sunday: 3PM'),
    ).toBeInTheDocument();
    expect(screen.getByText('Endorsement: Submitted')).toBeInTheDocument();
    expect(screen.getByText('CCF VMT registration confirmed')).toBeInTheDocument();
  });
});
