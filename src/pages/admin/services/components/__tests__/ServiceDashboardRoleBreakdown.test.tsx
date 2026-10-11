import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ROUTE_PATHS } from '@/config/constants';
import type { DashboardStatsResponse } from '@/hooks/domain/services';

import { ServiceDashboardRoleBreakdown } from '../ServiceDashboardRoleBreakdown';

const mockWindowOpen = vi.fn();
vi.stubGlobal('open', mockWindowOpen);

describe('ServiceDashboardRoleBreakdown', () => {
  const defaultParams = new URLSearchParams('from=2023-01-01&to=2023-01-31');
  const mockStats: DashboardStatsResponse = {
    roles: ['Usher', 'Tech'],
    committed_roles: ['Usher', 'Tech'],
    time_slots: {
      '9AM': {
        committed: 10,
        present: 8,
        walk_ins: 2,
        late_tardy: 1,
        roles: { Usher: 5, Tech: 3 },
        committed_roles: { Usher: 6, Tech: 4 },
      },
      '12NN': {
        committed: 15,
        present: 12,
        walk_ins: 3,
        late_tardy: 0,
        roles: { Usher: 8, Tech: 4 },
        committed_roles: { Usher: 9, Tech: 5 },
      },
      '3PM': {
        committed: 5,
        present: 5,
        walk_ins: 0,
        late_tardy: 0,
        roles: { Usher: 2, Tech: 3 },
        committed_roles: { Usher: 3, Tech: 2 },
      },
    },
  };

  it('renders "No volunteer roles" when roles array is empty', () => {
    render(
      <ServiceDashboardRoleBreakdown
        stats={{ ...mockStats, roles: [], committed_roles: [] }}
        dateFilterParams={defaultParams}
      />,
    );
    expect(screen.getByText('No volunteer roles recorded for this period.')).toBeInTheDocument();
  });

  it('renders role breakdown cards correctly with attended / committed totals', () => {
    render(<ServiceDashboardRoleBreakdown stats={mockStats} dateFilterParams={defaultParams} />);
    expect(screen.getByText('Attendance & Commitment by Role')).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('Tech')).toBeInTheDocument();

    expect(screen.getByText('15 / 18')).toBeInTheDocument();
    expect(screen.getByText('10 / 11')).toBeInTheDocument();
  });

  it('opens new tab with correct URL when a role count is clicked', async () => {
    const user = userEvent.setup();
    render(<ServiceDashboardRoleBreakdown stats={mockStats} dateFilterParams={defaultParams} />);

    const amUsherBtn = screen.getByTitle('View Usher attendance for 9AM (opens in new tab)');
    expect(amUsherBtn).not.toBeDisabled();

    await user.click(amUsherBtn);

    const expectedUrl = `${ROUTE_PATHS.adminServiceAttendanceData}?from=2023-01-01&to=2023-01-31&role=Usher&time_slot=9AM`;
    expect(mockWindowOpen).toHaveBeenCalledWith(expectedUrl, '_blank', 'noopener,noreferrer');
  });

  it('disables button if count is 0', () => {
    const zeroStats: DashboardStatsResponse = {
      ...mockStats,
      time_slots: {
        '9AM': {
          committed: 10,
          present: 8,
          walk_ins: 2,
          late_tardy: 1,
          roles: { Usher: 0, Tech: 0 },
        },
        '12NN': {
          committed: 15,
          present: 12,
          walk_ins: 3,
          late_tardy: 0,
          roles: { Usher: 0, Tech: 0 },
        },
        '3PM': {
          committed: 5,
          present: 5,
          walk_ins: 0,
          late_tardy: 0,
          roles: { Usher: 0, Tech: 0 },
        },
      },
    };

    render(<ServiceDashboardRoleBreakdown stats={zeroStats} dateFilterParams={defaultParams} />);

    const zeroBtns = screen.getAllByRole('button');
    expect(zeroBtns[0]).toBeDisabled();
  });
});
