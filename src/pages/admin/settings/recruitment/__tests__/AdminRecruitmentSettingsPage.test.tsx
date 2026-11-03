import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { RecruitmentSettings } from '@/lib/domain/recruitment';

import { AdminRecruitmentSettingsPage } from '../index';

const mockMutate = vi.fn();

const mockSettings: RecruitmentSettings = {
  id: 1,
  is_recruitment_open: true,
  eligibility_rules: {
    min_age: 18,
    max_age: 45,
    min_dgroup_months: 6,
    requires_glc1_completed: true,
  },
  vmt_registration_url: 'https://vmt.ccf.org.ph/register',
  orientation_instructions: 'Bring your Bible and notebook.',
  survey_questions: [
    {
      id: 'sq_1',
      field_key: 'survey_q1',
      label: 'Jesus Christ is God.',
      field_type: 'radio',
      is_required: true,
      is_active: true,
      display_order: 1,
      options: [
        { label: 'True', value: 'true' },
        { label: 'False', value: 'false' },
      ],
      correct_answer: 'true',
      explanation: 'John 1:1, 10:30',
    },
  ],
  endorsement_questions: [
    {
      id: 'eq_1',
      field_key: 'leader_full_name',
      label: 'What is your full name?',
      field_type: 'text',
      is_required: true,
      is_active: true,
      display_order: 1,
    },
  ],
  updated_at: '2026-11-01T08:00:00+08:00',
};

vi.mock('@/hooks/domain/recruitment', () => ({
  useRecruitmentSettingsQuery: () => ({
    data: mockSettings,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useUpdateRecruitmentSettingsMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => ({
    can: () => true,
    user: { id: 'admin-user-1' },
    isAuthenticated: true,
  }),
}));

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AdminRecruitmentSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header and tabs correctly', () => {
    renderWithRouter(<AdminRecruitmentSettingsPage />);

    expect(screen.getByText('Volunteer Recruitment Settings')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /general & status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /doctrinal survey questions/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dgroup endorsement prompts/i })).toBeInTheDocument();
  });

  it('populates general settings form from query data', () => {
    renderWithRouter(<AdminRecruitmentSettingsPage />);

    expect(screen.getByDisplayValue('https://vmt.ccf.org.ph/register')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bring your Bible and notebook.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('18')).toBeInTheDocument();
    expect(screen.getByDisplayValue('45')).toBeInTheDocument();
    expect(screen.getByText('Open for Applications')).toBeInTheDocument();
  });

  it('switches to survey questions tab and displays doctrinal statement', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminRecruitmentSettingsPage />);

    await user.click(screen.getByRole('button', { name: /doctrinal survey questions/i }));

    expect(screen.getByText('20-Question Doctrinal Survey Bank')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jesus Christ is God.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John 1:1, 10:30')).toBeInTheDocument();
  });

  it('switches to endorsement prompts tab and displays DGroup field', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminRecruitmentSettingsPage />);

    await user.click(screen.getByRole('button', { name: /dgroup endorsement prompts/i }));

    expect(screen.getByText(/25-Field DGroup Leader Attestation/i)).toBeInTheDocument();
    expect(screen.getByText('leader_full_name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('What is your full name?')).toBeInTheDocument();
  });

  it('enables Save button when form is dirty and calls mutate on submit', async () => {
    const user = userEvent.setup();
    renderWithRouter(<AdminRecruitmentSettingsPage />);

    const urlInput = screen.getByDisplayValue('https://vmt.ccf.org.ph/register');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://vmt.ccf.org.ph/new-link');

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
    });
  });
});
