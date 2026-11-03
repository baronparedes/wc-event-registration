import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RecruitmentHubBanner } from '../RecruitmentHubBanner';

const {
  mockUseAdminAuthQuery,
  mockUseAuthSessionQuery,
  mockUseMyRecruitmentApplicationQuery,
  mockUsePublicRecruitmentConfigQuery,
} = vi.hoisted(() => ({
  mockUseAdminAuthQuery: vi.fn(),
  mockUseAuthSessionQuery: vi.fn(),
  mockUseMyRecruitmentApplicationQuery: vi.fn(),
  mockUsePublicRecruitmentConfigQuery: vi.fn(),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: (...args: unknown[]) => mockUseAdminAuthQuery(...args),
  useAuthSessionQuery: () => mockUseAuthSessionQuery(),
}));

vi.mock('@/hooks/domain/recruitment', () => ({
  useMyRecruitmentApplicationQuery: (...args: unknown[]) =>
    mockUseMyRecruitmentApplicationQuery(...args),
  usePublicRecruitmentConfigQuery: () => mockUsePublicRecruitmentConfigQuery(),
}));

function renderBanner() {
  return render(
    <MemoryRouter>
      <RecruitmentHubBanner />
    </MemoryRouter>,
  );
}

describe('RecruitmentHubBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthSessionQuery.mockReturnValue({ data: null });
    mockUseAdminAuthQuery.mockReturnValue({ data: { adminRole: null }, isLoading: false });
    mockUseMyRecruitmentApplicationQuery.mockReturnValue({ data: null, isLoading: false });
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: { is_recruitment_open: true },
      isLoading: false,
    });
  });

  it('keeps the application invite hidden from unauthenticated visitors', () => {
    renderBanner();

    expect(screen.queryByRole('region', { name: 'Welcome Center team' })).toBeNull();
  });

  it('invites an authorized staff account to join when applications are open', () => {
    mockUseAuthSessionQuery.mockReturnValue({
      data: { user: { id: 'auth-user-1' } },
      isLoading: false,
    });
    mockUseAdminAuthQuery.mockReturnValue({ data: { adminRole: 'vmt' }, isLoading: false });

    renderBanner();

    expect(screen.getByRole('heading', { name: 'Join the Welcome Center Team' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Join Now' })).toHaveAttribute(
      'href',
      '/recruitment/apply',
    );
  });

  it('shows active applicants their current step even when recruitment is closed', () => {
    mockUseAuthSessionQuery.mockReturnValue({ data: { user: { id: 'auth-user-1' } } });
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: { is_recruitment_open: false },
      isLoading: false,
    });
    mockUseMyRecruitmentApplicationQuery.mockReturnValue({
      data: { status: 'active', current_step: 4 },
      isLoading: false,
    });

    renderBanner();

    expect(screen.getByRole('heading', { name: 'Your Application: Step 4 of 9' })).toBeVisible();
    expect(screen.getByRole('progressbar', { name: 'Application progress: 44%' })).toHaveAttribute(
      'aria-valuenow',
      '44',
    );
    expect(screen.getByRole('link', { name: 'View Status' })).toHaveAttribute(
      'href',
      '/recruitment',
    );
    expect(mockUseMyRecruitmentApplicationQuery).toHaveBeenCalledWith('auth-user-1', true);
  });

  it('hides the banner when recruitment is closed and there is no active application', () => {
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: { is_recruitment_open: false },
      isLoading: false,
    });

    renderBanner();

    expect(screen.queryByRole('region', { name: 'Welcome Center team' })).toBeNull();
  });

  it('waits for the auth session before showing the prospective applicant CTA', () => {
    mockUseAuthSessionQuery.mockReturnValue({ data: undefined, isLoading: true });

    renderBanner();

    expect(screen.queryByRole('region', { name: 'Welcome Center team' })).toBeNull();
  });

  it.each(['admin', 'super_admin', 'kiosk', 'vmt'] as const)(
    'shows the closed-state banner to %s users',
    (role) => {
      mockUseAuthSessionQuery.mockReturnValue({
        data: { user: { id: 'auth-user-1' } },
        isLoading: false,
      });
      mockUsePublicRecruitmentConfigQuery.mockReturnValue({
        data: { is_recruitment_open: false },
        isLoading: false,
      });
      mockUseMyRecruitmentApplicationQuery.mockReturnValue({ data: null, isLoading: false });
      mockUseAdminAuthQuery.mockReturnValue({ data: { adminRole: role }, isLoading: false });

      renderBanner();

      expect(screen.getByRole('heading', { name: 'Welcome Center Team' })).toBeVisible();
      expect(screen.getByText('Applications are currently closed.')).toBeVisible();
      expect(screen.getByRole('link', { name: 'View Application' })).toHaveAttribute(
        'href',
        '/recruitment/apply',
      );
      expect(mockUseAdminAuthQuery).toHaveBeenCalledWith(true);
    },
  );

  it('does not expose the closed-state banner to other admin roles', () => {
    mockUseAuthSessionQuery.mockReturnValue({
      data: { user: { id: 'auth-user-1' } },
      isLoading: false,
    });
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: { is_recruitment_open: false },
      isLoading: false,
    });
    mockUseMyRecruitmentApplicationQuery.mockReturnValue({ data: null, isLoading: false });
    mockUseAdminAuthQuery.mockReturnValue({ data: { adminRole: 'slod' }, isLoading: false });

    renderBanner();

    expect(screen.queryByRole('region', { name: 'Welcome Center team' })).toBeNull();
  });
});
