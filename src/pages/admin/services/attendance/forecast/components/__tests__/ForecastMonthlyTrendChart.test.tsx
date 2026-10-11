import React from 'react';

import { render, screen } from '@testing-library/react';
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
      sessions: [],
      totalTarget: 243,
      totalConfirmed: 210,
      totalOverShort: -33,
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
      sessions: [],
      totalTarget: 243,
      totalConfirmed: 245,
      totalOverShort: 2,
      hasDeficit: false,
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
    expect(screen.getByText('Net Variance')).toBeInTheDocument();
    expect(screen.getByText('-31')).toBeInTheDocument(); // 455 - 486

    const chart = screen.getByTestId('composed-chart');
    const items = JSON.parse(chart.getAttribute('data-items') || '[]');
    expect(items).toHaveLength(2);
    expect(items[0].target).toBe(243);
    expect(items[0].scheduled).toBe(250);
    expect(items[0].expected).toBe(210);
    expect(items[0].overShort).toBe(-33);
  });

  it('returns null if sundays is empty', () => {
    const { container } = render(
      <ForecastMonthlyTrendChart sundays={[]} roleGroupLabel="All Roles" />,
    );
    expect(container.firstChild).toBeNull();
  });
});
