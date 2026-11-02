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
        committed_roles: { Usher: 10, 'Prayer Coach': 10 },
      },
      '12NN': {
        committed: 15,
        present: 12,
        walk_ins: 1,
        late_tardy: 1,
        missed: 3,
        roles: { Usher: 8, 'Prayer Coach': 4 },
        committed_roles: { Usher: 8, 'Prayer Coach': 7 },
      },
      '3PM': {
        committed: 10,
        present: 8,
        walk_ins: 2,
        late_tardy: 0,
        missed: 2,
        roles: { Usher: 5, 'Prayer Coach': 3 },
        committed_roles: { Usher: 5, 'Prayer Coach': 5 },
      },
    },
    roles: ['Usher', 'Prayer Coach'],
    committed_roles: ['Usher', 'Prayer Coach'],
    unique_volunteers: 35,
  };

  it('calculates turnup percentage correctly', () => {
    expect(getTurnupPercentage(18, 20)).toBe(90);
    expect(getTurnupPercentage(0, 0)).toBe(0);
    expect(getTurnupPercentage(5, 10)).toBe(50);
  });

  it('renders overall metrics, per-slot cells, and role breakdown for Sunday filter mode', () => {
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

    // Unique volunteers and overall turn-up header badges
    expect(screen.getByText('35 Unique Volunteers')).toBeInTheDocument();
    expect(screen.getByText('84% Overall Turn-Up')).toBeInTheDocument();

    // Key Service Metrics Table
    expect(screen.getByText('Key Service Metrics')).toBeInTheDocument();
    expect(screen.getByText('9AM Service')).toBeInTheDocument();
    expect(screen.getByText('12NN Service')).toBeInTheDocument();
    expect(screen.getByText('3PM Service')).toBeInTheDocument();

    // 6 Metrics Rows
    expect(screen.getByText('Committed')).toBeInTheDocument();
    expect(screen.getByText('45 Total')).toBeInTheDocument();

    expect(screen.getByText('Present')).toBeInTheDocument();
    expect(screen.getByText('38 Total')).toBeInTheDocument();
    expect(screen.getByText('+3 walk-in')).toBeInTheDocument();

    expect(screen.getByText('Turn-Up Rate')).toBeInTheDocument();
    expect(screen.getByText('84% Avg')).toBeInTheDocument();

    expect(screen.getByText('Missed Commitments')).toBeInTheDocument();
    expect(screen.getByText('7 Total')).toBeInTheDocument();

    expect(screen.getByText('Late Check-In')).toBeInTheDocument();
    expect(screen.getByText('3 Total')).toBeInTheDocument();

    expect(screen.getByText('Total Walk-In')).toBeInTheDocument();
    expect(screen.getByText('6 Total')).toBeInTheDocument();

    // Attendance & Commitment by Role Section
    expect(screen.getByText('Attendance & Commitment by Role')).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('Prayer Coach')).toBeInTheDocument();
    // Usher: 23 attended / 23 committed
    expect(screen.getByText('23 / 23')).toBeInTheDocument();
    // Prayer Coach: 15 attended / 22 committed
    expect(screen.getByText('15 / 22')).toBeInTheDocument();

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

  it('gracefully handles empty roles and zero commitments', () => {
    const emptyStats: DashboardStatsResponse = {
      time_slots: {
        '9AM': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, missed: 0, roles: {} },
        '12NN': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, missed: 0, roles: {} },
        '3PM': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, missed: 0, roles: {} },
      },
      roles: [],
      committed_roles: [],
      unique_volunteers: 0,
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
    expect(screen.getByText('No volunteer roles recorded for this period.')).toBeInTheDocument();
  });
});
