import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { SundayForecastData } from '@/pages/admin/services/attendance/forecast/hooks/useAttendanceForecastData';

import { ShareSundayForecastDialog } from '../ShareSundayForecastDialog';

describe('ShareSundayForecastDialog', () => {
  const mockSundays: SundayForecastData[] = [
    {
      date: new Date(2026, 9, 4),
      dayNumber: 4,
      isoDateKey: '2026-10-04',
      sundayKey: 'first_sunday',
      ordinalLabel: '1st Sunday',
      formattedDate: 'October 4, 2026',
      entriesByTimeSlot: { '9AM': [], '12NN': [], '3PM': [] },
      totalScheduled: 10,
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
    } as unknown as SundayForecastData,
    {
      date: new Date(2026, 9, 11),
      dayNumber: 11,
      isoDateKey: '2026-10-11',
      sundayKey: 'second_sunday',
      ordinalLabel: '2nd Sunday',
      formattedDate: 'October 11, 2026',
      entriesByTimeSlot: { '9AM': [], '12NN': [], '3PM': [] },
      totalScheduled: 15,
      sessions: [
        { slot: '9AM' as const, target: 15, scheduled: 15, confirmed: 15, overShort: 0 },
        { slot: '12NN' as const, target: 15, scheduled: 15, confirmed: 15, overShort: 0 },
        { slot: '3PM' as const, target: 15, scheduled: 15, confirmed: 15, overShort: 0 },
      ],
      totalTarget: 45,
      totalConfirmed: 45,
      totalOverShort: 0,
      totalDeficit: 0,
      totalSurplus: 0,
      hasDeficit: false,
      forecast: {
        slot: 'ALL' as const,
        totalTarget: 45,
        totalCommitted: 45,
        totalExcused: 0,
        totalExpectedTurnup: 45,
        totalNeeded: 0,
        overallFulfillmentPercentage: 100,
        roleBreakdown: [],
      },
    } as unknown as SundayForecastData,
  ];

  it('does not render when isOpen is false', () => {
    render(
      <ShareSundayForecastDialog
        isOpen={false}
        onClose={vi.fn()}
        sundays={mockSundays}
        initialSundayKey="2026-10-04"
      />,
    );

    expect(screen.queryByText('Share Sunday Attendance Forecast')).not.toBeInTheDocument();
  });

  it('renders modal with Sunday forecast card preview and action buttons', () => {
    const handleClose = vi.fn();
    render(
      <ShareSundayForecastDialog
        isOpen={true}
        onClose={handleClose}
        sundays={mockSundays}
        initialSundayKey="2026-10-04"
      />,
    );

    expect(screen.getByText('Share Sunday Attendance Forecast')).toBeInTheDocument();
    expect(screen.getAllByText('October 4, 2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Copy Image/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Download Image/i).length).toBeGreaterThan(0);

    // Cancel button closes modal
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('allows switching the previewed Sunday via Sunday tabs', () => {
    render(
      <ShareSundayForecastDialog
        isOpen={true}
        onClose={vi.fn()}
        sundays={mockSundays}
        initialSundayKey="2026-10-04"
      />,
    );

    expect(screen.getAllByText('October 4, 2026').length).toBeGreaterThanOrEqual(1);

    // Switch to 2nd Sunday
    const secondSundayBtn = screen.getByRole('button', { name: /2nd Sunday/i });
    fireEvent.click(secondSundayBtn);

    expect(screen.getAllByText('October 11, 2026').length).toBeGreaterThanOrEqual(1);
  });
});
