import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_APP_SETTINGS } from '@/lib/domain/app-settings';

import { AdminSystemSettingsPage } from '../index';

const mockMutateAsync = vi.fn();

vi.mock('@/hooks/domain/app-settings', () => ({
  useAppSettingsQuery: () => ({
    data: DEFAULT_APP_SETTINGS,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useUpdateAppSettingMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/domain/auth', () => ({
  useAdminAuthQuery: () => ({
    role: 'admin',
    permissions: ['canWriteAdminData'],
    can: () => true,
  }),
}));

describe('AdminSystemSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
  });

  it('renders staffing & forecast tab by default and switches between tabs', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AdminSystemSettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'System & Service Settings' })).toBeInTheDocument();
    expect(screen.getByText('Volunteer Staffing Targets by Service Slot')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Scoring & Leave Policy' }));
    expect(screen.getByText('Attendance Commitment Scoring Weights')).toBeInTheDocument();
    expect(screen.getByText('Volunteer Long Leave Policy')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Roles & Time Slots' }));
    expect(screen.getByText('Sunday Service Time Slots')).toBeInTheDocument();
    expect(screen.getByText('Volunteer Ministry Roles')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Automated Jobs' }));
    expect(screen.getByText('Weekly Sunday Executive Debrief Recipients')).toBeInTheDocument();
  });

  it('submits updated weekly debrief recipient roles from Automated Jobs tab', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AdminSystemSettingsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Automated Jobs' }));
    await user.click(screen.getByLabelText('Admin'));
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        key: 'weekly_debrief_config',
        value: { recipient_roles: ['OIC', 'admin'] },
      });
    });
  });

  it('submits updated scoring weights and long leave policy from Scoring & Leave tab', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AdminSystemSettingsPage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: 'Scoring & Leave Policy' }));
    const minWeeksInput = screen.getByLabelText('Minimum Leave Duration (Weeks)');
    fireEvent.change(minWeeksInput, { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        key: 'long_leave_policy',
        value: {
          min_weeks: 5,
          min_days: 35,
          require_sunday_dates: true,
        },
      });
    });
  });
});
