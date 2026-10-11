import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SundayForecastData } from '@/pages/admin/services/attendance/forecast/hooks/useAttendanceForecastData';

import { ForecastMonthlyTrendChart } from '../ForecastMonthlyTrendChart';

vi.mock('recharts', async () => {
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
    ComposedChart: ({
      children,
      data,
    }: {
      children: React.ReactNode;
      data: Array<{ label: string; target: number; scheduled: number; expected: number }>;
    }) => (
      <div data-testid="composed-chart" data-items={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Area: () => <div data-testid="area" />,
    Bar: () => <div data-testid="bar" />,
    Line: () => <div data-testid="line" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
  };
});

describe('ForecastMonthlyTrendChart', () => {
  const sampleSundays: SundayForecastData[] = [
    {
      date: new Date(2026, 9, 4),
      dayNumber: 4,
      isoDateKey: '2026-10-04',
      sundayKey: 'first_sunday',
      ordinalLabel: '1st Sunday',
      formattedDate: 'October 4, 2026',
      entriesByTimeSlot: { '9AM': [], '12NN': [], '3PM': [] },
      totalScheduled: 250,
      sessions: [
        { slot: '9AM', target: 81, scheduled: 84, confirmed: 70, overShort: -11 },
        { slot: '12NN', target: 71, scheduled: 83, confirmed: 70, overShort: -1 },
        { slot: '3PM', target: 91, scheduled: 83, confirmed: 70, overShort: -21 },
      ],
      totalTarget: 243,
      totalConfirmed: 210,
      totalOverShort: -33,
      totalDeficit: 33,
      totalSurplus: 0,
      hasDeficit: true,
      forecast: {} as never,
    },
    {
      date: new Date(2026, 9, 11),
      dayNumber: 11,
      isoDateKey: '2026-10-11',
      sundayKey: 'second_sunday',
      ordinalLabel: '2nd Sunday',
      formattedDate: 'October 11, 2026',
      entriesByTimeSlot: { '9AM': [], '12NN': [], '3PM': [] },
      totalScheduled: 260,
      sessions: [
        { slot: '9AM', target: 81, scheduled: 90, confirmed: 85, overShort: 4 },
        { slot: '12NN', target: 71, scheduled: 85, confirmed: 80, overShort: 9 },
        { slot: '3PM', target: 91, scheduled: 85, confirmed: 80, overShort: -11 },
      ],
      totalTarget: 243,
      totalConfirmed: 245,
      totalOverShort: 2,
      totalDeficit: 11,
      totalSurplus: 13,
      hasDeficit: true,
      forecast: {} as never,
    },
  ];

  it('renders monthly trend header, badge, chart, and footer summary', () => {
    render(<ForecastMonthlyTrendChart sundays={sampleSundays} roleGroupLabel="All Roles" />);

    expect(screen.getByText(/Monthly Attendance Trend/i)).toBeInTheDocument();
    expect(screen.getByText('All Roles')).toBeInTheDocument();
    expect(screen.getByText('Month Target')).toBeInTheDocument();
    expect(screen.getByText('486')).toBeInTheDocument(); // 243 + 243
    expect(screen.getByText('Month Scheduled')).toBeInTheDocument();
    expect(screen.getByText('510')).toBeInTheDocument(); // 250 + 260
    expect(screen.getByText('Month Expected')).toBeInTheDocument();
    expect(screen.getByText('455')).toBeInTheDocument(); // 210 + 245
    expect(screen.getByText('Staffing Deficit')).toBeInTheDocument();
    expect(screen.getByText('-44 Needed')).toBeInTheDocument(); // 33 + 11

    const chart = screen.getByTestId('composed-chart');
    const items = JSON.parse(chart.getAttribute('data-items') || '[]');
    expect(items).toHaveLength(2);
    expect(items[0].target).toBe(243);
    expect(items[0].scheduled).toBe(250);
    expect(items[0].expected).toBe(210);
    expect(items[0].overShort).toBe(-33);
  });

  it('allows filtering by session slot', () => {
    render(<ForecastMonthlyTrendChart sundays={sampleSundays} roleGroupLabel="All Roles" />);

    const nineAmButton = screen.getByRole('button', { name: '9 AM' });
    fireEvent.click(nineAmButton);

    expect(nineAmButton).toHaveAttribute('aria-pressed', 'true');

    // 9 AM targets across the two Sundays: 81 + 81 = 162
    expect(screen.getByText('162')).toBeInTheDocument();
    // 9 AM scheduled across the two Sundays: 84 + 90 = 174
    expect(screen.getByText('174')).toBeInTheDocument();
    // 9 AM expected across the two Sundays: 70 + 85 = 155
    expect(screen.getByText('155')).toBeInTheDocument();
    expect(screen.getByText('-11 Needed')).toBeInTheDocument();

    const chart = screen.getByTestId('composed-chart');
    const items = JSON.parse(chart.getAttribute('data-items') || '[]');
    expect(items[0].sessionLabel).toBe('9AM Session');
    expect(items[0].target).toBe(81);
    expect(items[0].scheduled).toBe(84);
    expect(items[0].expected).toBe(70);
  });

  it('returns null if sundays is empty', () => {
    const { container } = render(
      <ForecastMonthlyTrendChart sundays={[]} roleGroupLabel="All Roles" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
