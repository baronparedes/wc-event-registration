import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LEGAL_CONFIG } from '@/config/constants';
import type { DashboardStatsResponse } from '@/hooks/domain/services';

import { ServiceDashboardShareCard } from '../ServiceDashboardShareCard';
import { getTurnupPercentage } from '../utils';

describe('ServiceDashboardShareCard', () => {
  const mockStats: DashboardStatsResponse = {
    time_slots: {
      '9AM': {
        committed: 20,
        present: 18,
        walk_ins: 3,
        late_tardy: 2,
        missed: 2,
        roles: { Usher: 10, 'Prayer Coach': 8 },
      },
      '12NN': {
        committed: 15,
        present: 12,
        walk_ins: 1,
        late_tardy: 1,
        missed: 3,
        roles: { Usher: 8, 'Prayer Coach': 4 },
      },
      '3PM': {
        committed: 10,
        present: 8,
        walk_ins: 2,
        late_tardy: 0,
        missed: 2,
        roles: { Usher: 5, 'Prayer Coach': 3 },
      },
    },
    roles: ['Usher', 'Prayer Coach'],
  };

  it('calculates turnup percentage correctly', () => {
    expect(getTurnupPercentage(18, 20)).toBe(90);
    expect(getTurnupPercentage(0, 0)).toBe(0);
    expect(getTurnupPercentage(5, 10)).toBe(50);
  });

  it('renders overall metrics and slot breakdown for Sunday filter mode', () => {
    render(
      <ServiceDashboardShareCard
        stats={mockStats}
        filterMode="sunday"
        selectedSunday="2026-11-01"
        selectedYear={2026}
        selectedMonth={11}
      />,
    );

    // Title and date
    expect(screen.getByText('Services Dashboard')).toBeInTheDocument();
    expect(screen.getByText('November 1, 2026')).toBeInTheDocument();

    // Summary Metric Cards (Total Expected: 45, Present: 38, Missed: 7, Late: 3, Walk-ins: 6)
    // Turnup: 38 / 45 = 84%
    expect(screen.getByText('84% Overall Turn-Up')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('38')).toBeInTheDocument();
    expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1); // totalMissed
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // totalLateTardy
    expect(screen.getByText('6')).toBeInTheDocument(); // totalWalkIns

    // Service Breakdown Table
    expect(screen.getByText('Service Breakdown by Time Slot')).toBeInTheDocument();
    expect(screen.getByText('9AM Service')).toBeInTheDocument();
    expect(screen.getByText('12NN Service')).toBeInTheDocument();
    expect(screen.getByText('3PM Service')).toBeInTheDocument();

    // Footer with legal config
    expect(
      screen.getByText(new RegExp(`Generated from ${LEGAL_CONFIG.organizationName}`, 'i')),
    ).toBeInTheDocument();
  });

  it('formats month and annual display dates correctly', () => {
    const { rerender } = render(
      <ServiceDashboardShareCard
        stats={mockStats}
        filterMode="month"
        selectedSunday="2026-11-01"
        selectedYear={2026}
        selectedMonth={11}
      />,
    );
    expect(screen.getByText('November 2026')).toBeInTheDocument();

    rerender(
      <ServiceDashboardShareCard
        stats={mockStats}
        filterMode="annual"
        selectedSunday="2026-11-01"
        selectedYear={2026}
        selectedMonth={11}
      />,
    );
    expect(screen.getByText('Year 2026')).toBeInTheDocument();
  });

  it('gracefully handles empty / zero commitments', () => {
    const emptyStats: DashboardStatsResponse = {
      time_slots: {
        '9AM': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, missed: 0, roles: {} },
        '12NN': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, missed: 0, roles: {} },
        '3PM': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, missed: 0, roles: {} },
      },
      roles: [],
    };

    render(
      <ServiceDashboardShareCard
        stats={emptyStats}
        filterMode="sunday"
        selectedSunday=""
        selectedYear={2026}
        selectedMonth={11}
      />,
    );

    expect(screen.getByText('Sunday Service')).toBeInTheDocument();
    expect(screen.getByText('0% Overall Turn-Up')).toBeInTheDocument();
  });
});
