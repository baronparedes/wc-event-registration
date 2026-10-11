import React from 'react';

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SundayForecastData } from '@/pages/admin/services/attendance/forecast/hooks/useAttendanceForecastData';

import { CustomXAxisTick, ForecastMonthlyTrendChart } from '../ForecastMonthlyTrendChart';

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
      data: Array<{
        label: string;
        target: number;
        scheduled: number;
        expected: number;
        sessionLabel: string;
        overShort: number;
      }>;
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

  it('renders chronological sessions and alerts on sessions with deficits', () => {
    render(<ForecastMonthlyTrendChart sundays={sampleSundays} roleGroupLabel="All Roles" />);

    expect(screen.getByText(/Monthly Attendance Trend/i)).toBeInTheDocument();
    expect(screen.getByText('All Roles')).toBeInTheDocument();
    expect(screen.getByText(/4 Sessions Short/i)).toBeInTheDocument();

    expect(screen.getByText('Month Target')).toBeInTheDocument();
    expect(screen.getByText('486')).toBeInTheDocument(); // 243 + 243
    expect(screen.getByText('Month Scheduled')).toBeInTheDocument();
    expect(screen.getByText('510')).toBeInTheDocument(); // 250 + 260
    expect(screen.getByText('Month Expected')).toBeInTheDocument();
    expect(screen.getByText('455')).toBeInTheDocument(); // 210 + 245
    expect(screen.getByText('Staffing Deficit')).toBeInTheDocument();
    expect(screen.getByText(/-44 Needed \(4 Short\)/i)).toBeInTheDocument();

    const chart = screen.getByTestId('composed-chart');
    const items = JSON.parse(chart.getAttribute('data-items') || '[]');
    // 2 Sundays * 3 sessions = 6 chronological data points
    expect(items).toHaveLength(6);
    expect(items[0].label).toBe('Oct 4 9AM');
    expect(items[0].target).toBe(81);
    expect(items[0].scheduled).toBe(84);
    expect(items[0].expected).toBe(70);

    expect(items[2].label).toBe('Oct 4 3PM');
    expect(items[2].target).toBe(91);
    expect(items[2].expected).toBe(70);
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
    expect(screen.getByText(/-11 Needed \(1 Short\)/i)).toBeInTheDocument();

    const chart = screen.getByTestId('composed-chart');
    const items = JSON.parse(chart.getAttribute('data-items') || '[]');
    // Filtered to 9AM: 2 data points
    expect(items).toHaveLength(2);
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

  describe('CustomXAxisTick', () => {
    const mockChartData = [
      {
        id: '2026-10-04-9AM',
        label: 'Oct 4 9AM',
        shortLabel: '10/4 9A',
        sundayLabel: '1st Sunday',
        sundayDate: 'Oct 4',
        formattedDate: 'October 4, 2026',
        session: '9AM' as const,
        sessionLabel: '9AM Session',
        sessionDisplay: '9 AM',
        isMiddleOfSunday: false,
        isFirstOfSunday: true,
        isLastOfSunday: false,
        target: 80,
        scheduled: 85,
        expected: 80,
        overShort: 0,
        hasDeficit: false,
        fulfillmentRate: 100,
      },
      {
        id: '2026-10-04-12NN',
        label: 'Oct 4 12NN',
        shortLabel: '10/4 12N',
        sundayLabel: '1st Sunday',
        sundayDate: 'Oct 4',
        formattedDate: 'October 4, 2026',
        session: '12NN' as const,
        sessionLabel: '12NN Session',
        sessionDisplay: '12 NN',
        isMiddleOfSunday: true,
        isFirstOfSunday: false,
        isLastOfSunday: false,
        target: 70,
        scheduled: 75,
        expected: 70,
        overShort: 0,
        hasDeficit: false,
        fulfillmentRate: 100,
      },
      {
        id: '2026-10-04-3PM',
        label: 'Oct 4 3PM',
        shortLabel: '10/4 3P',
        sundayLabel: '1st Sunday',
        sundayDate: 'Oct 4',
        formattedDate: 'October 4, 2026',
        session: '3PM' as const,
        sessionLabel: '3PM Session',
        sessionDisplay: '3 PM',
        isMiddleOfSunday: false,
        isFirstOfSunday: false,
        isLastOfSunday: true,
        target: 90,
        scheduled: 80,
        expected: 75,
        overShort: -15,
        hasDeficit: true,
        fulfillmentRate: 83,
      },
    ];

    it('renders session slot on top and groups Sunday date badge under 12 NN in All Sessions view', () => {
      // 9 AM tick (index 0)
      const { rerender } = render(
        <svg>
          <CustomXAxisTick
            x={100}
            y={200}
            payload={{ index: 0, value: 'Oct 4 9AM' }}
            chartData={mockChartData}
            isAllSessions={true}
          />
        </svg>,
      );
      expect(screen.getByText('9 AM')).toBeInTheDocument();
      expect(screen.queryByText('Oct 4')).not.toBeInTheDocument();

      // 12 NN tick (index 1) - middle of Sunday, should render both session and Sunday badge
      rerender(
        <svg>
          <CustomXAxisTick
            x={150}
            y={200}
            payload={{ index: 1, value: 'Oct 4 12NN' }}
            chartData={mockChartData}
            isAllSessions={true}
          />
        </svg>,
      );
      expect(screen.getByText('12 NN')).toBeInTheDocument();
      expect(screen.getByText('Oct 4')).toBeInTheDocument();

      // 3 PM tick (index 2)
      rerender(
        <svg>
          <CustomXAxisTick
            x={200}
            y={200}
            payload={{ index: 2, value: 'Oct 4 3PM' }}
            chartData={mockChartData}
            isAllSessions={true}
          />
        </svg>,
      );
      expect(screen.getByText('3 PM')).toBeInTheDocument();
      expect(screen.queryByText('Oct 4')).not.toBeInTheDocument();
    });

    it('renders Sunday date and ordinal in single session view', () => {
      render(
        <svg>
          <CustomXAxisTick
            x={100}
            y={200}
            payload={{ index: 0, value: 'Oct 4 9AM' }}
            chartData={mockChartData}
            isAllSessions={false}
          />
        </svg>,
      );
      expect(screen.getByText('Oct 4')).toBeInTheDocument();
      expect(screen.getByText('1st Sunday')).toBeInTheDocument();
      expect(screen.queryByText('9 AM')).not.toBeInTheDocument();
    });

    it('returns null if chartData or point is not found', () => {
      const { container } = render(
        <svg>
          <CustomXAxisTick
            x={100}
            y={200}
            payload={{ index: 99, value: 'Unknown' }}
            chartData={mockChartData}
            isAllSessions={true}
          />
        </svg>,
      );
      expect(container.querySelector('g')).toBeNull();
    });
  });
});
