import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DashboardStatsResponse } from '@/hooks/domain/services';
import * as infrastructure from '@/lib/infrastructure';

import { ShareServiceDashboardDialog } from '../ShareServiceDashboardDialog';
import { getServiceDashboardExportFilename } from '../utils';

describe('ShareServiceDashboardDialog', () => {
  const mockStats: DashboardStatsResponse = {
    time_slots: {
      '9AM': {
        committed: 20,
        present: 18,
        walk_ins: 3,
        late_tardy: 2,
        missed: 2,
        roles: {},
      },
      '12NN': {
        committed: 15,
        present: 12,
        walk_ins: 1,
        late_tardy: 1,
        missed: 3,
        roles: {},
      },
      '3PM': {
        committed: 10,
        present: 8,
        walk_ins: 2,
        late_tardy: 0,
        missed: 2,
        roles: {},
      },
    },
    roles: [],
    unique_volunteers: 35,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getServiceDashboardExportFilename', () => {
    it('generates filename for sunday mode', () => {
      expect(getServiceDashboardExportFilename('sunday', '2026-11-01', 2026, 11)).toBe(
        'service-dashboard-2026-11-01.jpg',
      );
    });

    it('generates filename for month mode', () => {
      expect(getServiceDashboardExportFilename('month', '2026-11-01', 2026, 4)).toBe(
        'service-dashboard-2026-04.jpg',
      );
    });

    it('generates filename for annual mode', () => {
      expect(getServiceDashboardExportFilename('annual', '2026-11-01', 2026, 11)).toBe(
        'service-dashboard-2026.jpg',
      );
    });
  });

  it('does not render when isOpen is false', () => {
    render(
      <ShareServiceDashboardDialog
        isOpen={false}
        onClose={vi.fn()}
        stats={mockStats}
        filterMode="sunday"
        selectedSunday="2026-11-01"
        selectedYear={2026}
        selectedMonth={11}
      />,
    );

    expect(screen.queryByText('Share Dashboard Metrics')).not.toBeInTheDocument();
  });

  it('renders modal with dashboard preview and action buttons on desktop', () => {
    vi.spyOn(infrastructure, 'isMobileDevice').mockReturnValue(false);
    const handleClose = vi.fn();

    render(
      <ShareServiceDashboardDialog
        isOpen={true}
        onClose={handleClose}
        stats={mockStats}
        filterMode="sunday"
        selectedSunday="2026-11-01"
        selectedYear={2026}
        selectedMonth={11}
      />,
    );

    expect(screen.getByText('Share Dashboard Metrics')).toBeInTheDocument();
    expect(screen.getAllByText('November 1, 2026').length).toBeGreaterThanOrEqual(1);

    // Desktop actions
    expect(screen.getByRole('button', { name: /Copy Image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download Image/i })).toBeInTheDocument();

    // Cancel action
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders mobile-specific share actions when on a mobile device', () => {
    vi.spyOn(infrastructure, 'isMobileDevice').mockReturnValue(true);

    render(
      <ShareServiceDashboardDialog
        isOpen={true}
        onClose={vi.fn()}
        stats={mockStats}
        filterMode="sunday"
        selectedSunday="2026-11-01"
        selectedYear={2026}
        selectedMonth={11}
      />,
    );

    expect(screen.getByRole('button', { name: /Copy Image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Share Image/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download Image/i })).not.toBeInTheDocument();
  });
});
