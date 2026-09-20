import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DashboardStatsResponse } from '@/hooks/domain/services';

import {
  ServiceDashboardFilters,
  ServiceDashboardMetrics,
  ServiceDashboardRoleBreakdown,
} from '../index';

describe('ServiceDashboardFilters', () => {
  it('triggers mode change and stepper clicks', () => {
    const onFilterModeChange = vi.fn();
    const onSelectedSundayChange = vi.fn();
    const onSelectedYearChange = vi.fn();
    const onSelectedMonthChange = vi.fn();

    render(
      <ServiceDashboardFilters
        filterMode="sunday"
        onFilterModeChange={onFilterModeChange}
        selectedSunday="2026-03-15"
        onSelectedSundayChange={onSelectedSundayChange}
        selectedYear={2026}
        onSelectedYearChange={onSelectedYearChange}
        selectedMonth={3}
        onSelectedMonthChange={onSelectedMonthChange}
        maxSunday="2026-03-22"
      />,
    );

    const prevSundayBtn = screen.getByRole('button', { name: 'Previous Sunday' });
    fireEvent.click(prevSundayBtn);
    expect(onSelectedSundayChange).toHaveBeenCalledWith('2026-03-08');

    const nextSundayBtn = screen.getByRole('button', { name: 'Next Sunday' });
    fireEvent.click(nextSundayBtn);
    expect(onSelectedSundayChange).toHaveBeenCalledWith('2026-03-22');

    const monthTab = screen.getByRole('tab', { name: 'Month' });
    fireEvent.click(monthTab);
    expect(onFilterModeChange).toHaveBeenCalledWith('month');
  });

  it('triggers month and annual steps properly', () => {
    const onSelectedYearChange = vi.fn();
    const onSelectedMonthChange = vi.fn();

    const { rerender } = render(
      <ServiceDashboardFilters
        filterMode="month"
        onFilterModeChange={vi.fn()}
        selectedSunday="2026-03-15"
        onSelectedSundayChange={vi.fn()}
        selectedYear={2026}
        onSelectedYearChange={onSelectedYearChange}
        selectedMonth={2}
        onSelectedMonthChange={onSelectedMonthChange}
        maxSunday="2026-03-22"
      />,
    );

    const prevMonthBtn = screen.getByRole('button', { name: 'Previous Month' });
    fireEvent.click(prevMonthBtn);
    expect(onSelectedMonthChange).toHaveBeenCalledWith(1);

    // Annual mode
    rerender(
      <ServiceDashboardFilters
        filterMode="annual"
        onFilterModeChange={vi.fn()}
        selectedSunday="2026-03-15"
        onSelectedSundayChange={vi.fn()}
        selectedYear={2026}
        onSelectedYearChange={onSelectedYearChange}
        selectedMonth={2}
        onSelectedMonthChange={onSelectedMonthChange}
        maxSunday="2026-03-22"
      />,
    );

    const prevYearBtn = screen.getByRole('button', { name: 'Previous Year' });
    fireEvent.click(prevYearBtn);
    expect(onSelectedYearChange).toHaveBeenCalledWith(2025);
  });
});

describe('ServiceDashboardMetrics', () => {
  const sampleStats: DashboardStatsResponse = {
    time_slots: {
      '9AM': { committed: 10, present: 8, walk_ins: 2, late_tardy: 1, roles: { Usher: 5 } },
      '12NN': { committed: 20, present: 15, walk_ins: 5, late_tardy: 2, roles: { Usher: 10 } },
      '3PM': { committed: 30, present: 25, walk_ins: 10, late_tardy: 3, roles: { Usher: 15 } },
    },
    roles: ['Usher'],
  };

  it('renders primary metrics and exception cards with totals', () => {
    render(
      <ServiceDashboardMetrics stats={sampleStats} dateFilterParams={new URLSearchParams()} />,
    );

    expect(screen.getByText('Committed')).toBeInTheDocument();
    expect(screen.getByText('60 Total')).toBeInTheDocument();

    expect(screen.getByText('Present')).toBeInTheDocument();
    expect(screen.getByText('48 Total')).toBeInTheDocument();

    expect(screen.getByText('Turn-Up Rate')).toBeInTheDocument();
    expect(screen.getByText('80% Avg')).toBeInTheDocument();

    expect(screen.getByText('Late / Tardy')).toBeInTheDocument();
    expect(screen.getByText('6 Total')).toBeInTheDocument();

    expect(screen.getByText('Total Walk-In')).toBeInTheDocument();
    expect(screen.getByText('17 Total')).toBeInTheDocument();
  });
});

describe('ServiceDashboardRoleBreakdown', () => {
  it('renders role count cards and time slots', () => {
    const sampleStats: DashboardStatsResponse = {
      time_slots: {
        '9AM': {
          committed: 10,
          present: 8,
          walk_ins: 2,
          late_tardy: 1,
          roles: { Usher: 5, Greeter: 3 },
        },
        '12NN': {
          committed: 20,
          present: 15,
          walk_ins: 5,
          late_tardy: 2,
          roles: { Usher: 10, Greeter: 2 },
        },
        '3PM': {
          committed: 30,
          present: 25,
          walk_ins: 10,
          late_tardy: 3,
          roles: { Usher: 15, Greeter: 1 },
        },
      },
      roles: ['Usher', 'Greeter'],
    };

    render(
      <ServiceDashboardRoleBreakdown
        stats={sampleStats}
        dateFilterParams={new URLSearchParams()}
      />,
    );

    expect(screen.getByText('Attendance by Role')).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument(); // 5 + 10 + 15

    expect(screen.getByText('Greeter')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument(); // 3 + 2 + 1
  });

  it('renders empty message when no roles are present', () => {
    const emptyStats: DashboardStatsResponse = {
      time_slots: {
        '9AM': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, roles: {} },
        '12NN': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, roles: {} },
        '3PM': { committed: 0, present: 0, walk_ins: 0, late_tardy: 0, roles: {} },
      },
      roles: [],
    };

    render(
      <ServiceDashboardRoleBreakdown stats={emptyStats} dateFilterParams={new URLSearchParams()} />,
    );

    expect(screen.getByText('No volunteer roles recorded for this period.')).toBeInTheDocument();
  });
});
