import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';

import { RecruitmentApplyPage } from '../index';

const {
  mockUseAdminAuthQuery,
  mockUsePublicRecruitmentConfigQuery,
  mockUseSubmitRecruitmentApplicationMutation,
} = vi.hoisted(() => ({
  mockUseAdminAuthQuery: vi.fn(),
  mockUsePublicRecruitmentConfigQuery: vi.fn(),
  mockUseSubmitRecruitmentApplicationMutation: vi.fn(),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: (...args: unknown[]) => mockUseAdminAuthQuery(...args),
}));

vi.mock('@/hooks/domain/recruitment', () => ({
  usePublicRecruitmentConfigQuery: (...args: unknown[]) =>
    mockUsePublicRecruitmentConfigQuery(...args),
  useSubmitRecruitmentApplicationMutation: () => mockUseSubmitRecruitmentApplicationMutation(),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/recruitment/apply']}>
      <Routes>
        <Route path="/recruitment/apply" element={<RecruitmentApplyPage />} />
        <Route path="/login" element={<div data-testid="login-page" />} />
        <Route path={ROUTE_PATHS.notFound} element={<div data-testid="not-found-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const openRecruitmentConfig = {
  is_recruitment_open: true,
  eligibility_rules: {
    min_age: 18,
    max_age: 45,
    requires_glc1_completed: true,
    min_dgroup_months: 6,
  },
  vmt_registration_url: 'https://example.com/vmt',
  orientation_instructions: 'Attend the scheduled orientation.',
  survey_questions: [
    {
      field_key: 'survey_q1',
      label: 'Test doctrinal statement',
      field_type: 'radio' as const,
      is_required: true,
      is_active: true,
      options: [
        { label: 'True', value: 'true' },
        { label: 'False', value: 'false' },
      ],
    },
  ],
};

describe('RecruitmentApplyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminAuthQuery.mockReturnValue({
      data: {
        isAuthenticated: true,
        session: { user: { id: 'auth-user-1' } },
        adminRole: 'admin',
      },
      isLoading: false,
    });
    mockUseSubmitRecruitmentApplicationMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('shows loading placeholders while admin authentication is resolving', () => {
    mockUseAdminAuthQuery.mockReturnValue({ data: undefined, isLoading: true });
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });

    const { container } = renderPage();

    expect(container.querySelectorAll('.skeleton-shimmer')).toHaveLength(2);
    expect(mockUsePublicRecruitmentConfigQuery).toHaveBeenCalledWith(false);
  });

  it('shows the closed state when recruitment is not open', () => {
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: { ...openRecruitmentConfig, is_recruitment_open: false },
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(screen.getByRole('heading', { name: 'Applications are closed' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Before you apply' })).not.toBeInTheDocument();
    expect(mockUsePublicRecruitmentConfigQuery).toHaveBeenCalledWith(true);
  });

  it('shows loading placeholders while recruitment configuration loads', () => {
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    renderPage();

    expect(screen.queryByRole('heading', { name: 'Before you apply' })).not.toBeInTheDocument();
  });

  it('shows the configuration error message or its fallback', () => {
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('Test config unavailable'),
    });

    const { unmount } = renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('Test config unavailable');
    unmount();

    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: undefined,
    });
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Recruitment application settings are unavailable.',
    );
  });

  it('shows the pre-qualification gates when recruitment is open', async () => {
    mockUsePublicRecruitmentConfigQuery.mockReturnValue({
      data: openRecruitmentConfig,
      isLoading: false,
      isError: false,
    });

    renderPage();

    expect(screen.getByRole('heading', { name: 'Before you apply' })).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/I have read and understood the roles/i));
    fireEvent.click(
      screen.getByLabelText("I confirm that I have completed CCF's GLC Level 1 (Book 1 to 4)."),
    );
    fireEvent.click(screen.getByLabelText('I confirm that I can commit for 4 Services.'));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByRole('heading', { name: 'Step 2: Data Privacy and Liability Waiver' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Read the privacy policy' })).toBeInTheDocument();
    expect(mockUsePublicRecruitmentConfigQuery).toHaveBeenCalledWith(true);

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByText('Please review the eligibility checks above before continuing.'),
    ).toBeInTheDocument();
  });

  it('redirects signed-out visitors to sign in and disables the public config query', () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: { isAuthenticated: false, session: null, adminRole: null },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(mockUsePublicRecruitmentConfigQuery).toHaveBeenCalledWith(false);
  });

  it('redirects signed-in users outside the intake roles to 404', () => {
    mockUseAdminAuthQuery.mockReturnValue({
      data: {
        isAuthenticated: false,
        session: { user: { id: 'slod-user-1' } },
        adminRole: 'slod',
      },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByTestId('not-found-page')).toBeInTheDocument();
    expect(mockUsePublicRecruitmentConfigQuery).toHaveBeenCalledWith(false);
  });
});
