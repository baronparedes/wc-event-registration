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
    expect(
      screen.getByText((_, el) => el?.textContent?.trim() === 'Target: 15'),
    ).toBeInTheDocument();
    // Collapse/expand button should not exist
    expect(screen.queryByText(/Show Individual Role Breakdown/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Hide Individual Role Breakdown/i)).not.toBeInTheDocument();
  });

  it('hides individual role breakdown when showRoleBreakdownOption is false', () => {
    render(<SundayForecastCard sunday={mockSunday} showRoleBreakdownOption={false} />);

    expect(screen.queryByText('Individual Role Breakdown')).not.toBeInTheDocument();
    expect(screen.queryByText('Need 7')).not.toBeInTheDocument();
  });

  it('renders stacked per-slot role breakdown sections when slotBreakdowns is present', () => {
    const sundayWithSlots = {
      ...mockSunday,
      forecast: {
        slot: 'ALL' as const,
        totalTarget: 45,
        totalCommitted: 30,
        totalExcused: 0,
        totalExpectedTurnup: 25,
        totalNeeded: 20,
        overallFulfillmentPercentage: 55,
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
                target: 10,
                committed: 8,
                excused: 0,
                expectedTurnup: 6,
                needed: 4,
                surplus: 0,
                fulfillmentPercentage: 60,
              },
            ],
          },
          {
            slot: '12NN' as const,
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
                expectedTurnup: 9,
                needed: 6,
                surplus: 0,
                fulfillmentPercentage: 60,
              },
            ],
          },
          {
            slot: '3PM' as const,
            totalTarget: 15,
            totalCommitted: 10,
            totalExcused: 0,
            totalExpectedTurnup: 9,
            totalNeeded: 6,
            overallFulfillmentPercentage: 60,
            roleBreakdown: [
              {
                role: 'Usher',
                target: 20,
                committed: 12,
                excused: 0,
                expectedTurnup: 10,
                needed: 10,
                surplus: 0,
                fulfillmentPercentage: 50,
              },
            ],
          },
        ],
      },
    } as unknown as SundayForecastData;

    render(<SundayForecastCard sunday={sundayWithSlots} showRoleBreakdownOption={true} />);

    expect(screen.getByText('Individual Role Breakdown')).toBeInTheDocument();
    expect(screen.getAllByText('9 AM Session').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('12 NN Session').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3 PM Session').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Need 4')).toBeInTheDocument();
    expect(screen.getByText('Need 6')).toBeInTheDocument();
    expect(screen.getByText('Need 10')).toBeInTheDocument();
  });

  it('renders unified top summary banner with metrics and staffing status', () => {
    render(<SundayForecastCard sunday={mockSunday} />);

    expect(screen.getByText('Total Target')).toBeInTheDocument();
    expect(screen.getAllByText('15').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total Scheduled')).toBeInTheDocument();
    expect(screen.getAllByText('10').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Total Expected')).toBeInTheDocument();
    expect(screen.getByText('~8')).toBeInTheDocument();
    expect(screen.getByText('Staffing Status')).toBeInTheDocument();
    expect(screen.getAllByText('7 Short').length).toBeGreaterThanOrEqual(1);
  });

  it('renders role card with two-tier layout separating target and expected turnout', () => {
    render(<SundayForecastCard sunday={mockSunday} showRoleBreakdownOption={true} />);

    expect(screen.getByText('Usher')).toBeInTheDocument();
    expect(screen.getByText('Need 7')).toBeInTheDocument();
    expect(screen.getByText(/Target:/i)).toBeInTheDocument();
    expect(screen.getByText('~8 expected')).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: /Usher staffing fulfillment/i }),
    ).toBeInTheDocument();
  });
});
