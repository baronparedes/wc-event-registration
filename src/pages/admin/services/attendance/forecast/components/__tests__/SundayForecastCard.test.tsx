import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SundayForecastData } from '@/pages/admin/services/attendance/forecast/hooks/useAttendanceForecastData';

import { SundayForecastCard } from '../SundayForecastCard';

vi.mock('recharts', async () => {
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    ComposedChart: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="composed-chart">{children}</div>
    ),
    Bar: () => <div data-testid="bar" />,
    Line: () => <div data-testid="line" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
  };
});

describe('SundayForecastCard', () => {
  const mockSunday = {
    date: new Date(2026, 9, 4),
    dayNumber: 4,
    isoDateKey: '2026-10-04',
    sundayKey: 'first_sunday',
    ordinalLabel: '1st Sunday',
    formattedDate: 'October 4, 2026',
    entriesByTimeSlot: { '9AM': [], '12NN': [], '3PM': [] },
    totalScheduled: 10,
    sessions: [{ slot: '9AM' as const, target: 15, scheduled: 10, confirmed: 8, overShort: -7 }],
    totalTarget: 15,
    totalConfirmed: 8,
    totalOverShort: -7,
    totalDeficit: 7,
    totalSurplus: 0,
    hasDeficit: true,
    forecast: {
      roleBreakdown: [{ role: 'Usher', target: 15, scheduled: 10, expectedTurnup: 8, needed: 7 }],
    },
  } as unknown as SundayForecastData;

  it('defaults to Chart view and allows toggling to Table view', () => {
    render(<SundayForecastCard sunday={mockSunday} />);

    // Default view: Chart is rendered
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    expect(screen.queryByText('SESSION')).not.toBeInTheDocument();

    // Toggle to Table view
    const tableButton = screen.getByRole('button', { name: /Table/i });
    fireEvent.click(tableButton);

    expect(screen.getByText('SESSION')).toBeInTheDocument();
    expect(screen.queryByTestId('composed-chart')).not.toBeInTheDocument();

    // Toggle back to Chart view
    const chartButton = screen.getByRole('button', { name: /Chart/i });
    fireEvent.click(chartButton);

    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
  });

  it('always shows individual role breakdown when showRoleBreakdownOption is true', () => {
    render(<SundayForecastCard sunday={mockSunday} showRoleBreakdownOption={true} />);

    expect(screen.getByText('Individual Role Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('Need 7')).toBeInTheDocument();
    expect(screen.getByText('Target: 15')).toBeInTheDocument();
    // Collapse/expand button should not exist
    expect(screen.queryByText(/Show Individual Role Breakdown/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hide Individual Role Breakdown/i)).not.toBeInTheDocument();
  });

  it('hides individual role breakdown when showRoleBreakdownOption is false', () => {
    render(<SundayForecastCard sunday={mockSunday} showRoleBreakdownOption={false} />);

    expect(screen.queryByText('Individual Role Breakdown')).not.toBeInTheDocument();
    expect(screen.queryByText('Need 7')).not.toBeInTheDocument();
  });
});
