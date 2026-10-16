import React from 'react';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SundayForecastData } from '@/pages/admin/services/attendance/forecast/hooks/useAttendanceForecastData';

import { SundayForecastShareCard } from '../SundayForecastShareCard';

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

describe('SundayForecastShareCard', () => {
  const mockSunday = {
    date: new Date(2026, 9, 4),
    dayNumber: 4,
    isoDateKey: '2026-10-04',
    sundayKey: 'first_sunday',
    ordinalLabel: '1st Sunday',
    formattedDate: 'October 4, 2026',
    entriesByTimeSlot: { '9AM': [], '12NN': [], '3PM': [] },
    totalScheduled: 30,
    sessions: [
      { slot: '9AM' as const, target: 15, scheduled: 10, confirmed: 8, overShort: -7 },
      { slot: '12NN' as const, target: 15, scheduled: 10, confirmed: 8, overShort: -7 },
      { slot: '3PM' as const, target: 15, scheduled: 10, confirmed: 8, overShort: -7 },
    ],
    totalTarget: 45,
    totalConfirmed: 24,
    totalOverShort: -21,
    totalDeficit: 21,
    totalSurplus: 0,
    hasDeficit: true,
    forecast: {
      slot: 'ALL' as const,
      totalTarget: 45,
      totalCommitted: 30,
      totalExcused: 0,
      totalExpectedTurnup: 24,
      totalNeeded: 21,
      overallFulfillmentPercentage: 53,
      roleBreakdown: [],
      slotBreakdowns: [
        {
          slot: '9AM' as const,
          totalTarget: 15,
          totalCommitted: 10,
          totalExcused: 0,
          totalExpectedTurnup: 8,
          totalNeeded: 7,
          overallFulfillmentPercentage: 53,
          roleBreakdown: [
            {
              role: 'Usher',
              target: 15,
              committed: 10,
              excused: 0,
              expectedTurnup: 8,
              needed: 7,
              surplus: 0,
              fulfillmentPercentage: 53,
            },
          ],
        },
      ],
    },
  } as unknown as SundayForecastData;

  it('renders header, unified top summary banner, chart overview, and redesigned role cards', () => {
    render(<SundayForecastShareCard sunday={mockSunday} roleGroupLabel="Usher Team" />);

    // Header
    expect(screen.getByText('1st Sunday')).toBeInTheDocument();
    expect(screen.getByText('October 4, 2026')).toBeInTheDocument();
    expect(screen.getAllByText('21 Short').length).toBeGreaterThanOrEqual(1);

    // Unified Top Summary Banner
    expect(screen.getByText('Total Target')).toBeInTheDocument();
    expect(screen.getByText('45')).toBeInTheDocument();
    expect(screen.getByText('Total Scheduled')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Total Expected')).toBeInTheDocument();
    expect(screen.getByText('~24')).toBeInTheDocument();
    expect(screen.getByText('Staffing Status')).toBeInTheDocument();

    // Chart Overview
    expect(screen.getByText(/Usher Team Commitments — Chart Overview/i)).toBeInTheDocument();
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();

    // 3 Slot Overview Cards
    expect(screen.getAllByText('9 AM Session').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('12 NN Session').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3 PM Session').length).toBeGreaterThanOrEqual(1);

    // Redesigned Role Cards
    expect(screen.getByText('Individual Role Breakdown')).toBeInTheDocument();
    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('Need 7')).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.textContent?.trim() === 'Target: 15'),
    ).toBeInTheDocument();
    expect(screen.getByText('~8 expected')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: /Usher staffing fulfillment/i }),
    ).toBeInTheDocument();
  });
});
