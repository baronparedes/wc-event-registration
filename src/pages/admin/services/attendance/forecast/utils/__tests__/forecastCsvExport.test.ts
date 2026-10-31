import { describe, expect, it } from 'vitest';

import type { SundayForecastData } from '@/pages/admin/services/attendance/forecast/hooks/useAttendanceForecastData';

import { buildSundayForecastCsvExport } from '../forecastCsvExport';

describe('buildSundayForecastCsvExport', () => {
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
      sessions: [{ slot: '9AM', target: 15, scheduled: 10, confirmed: 8, overShort: -7 }],
      totalTarget: 15,
      totalConfirmed: 8,
      totalOverShort: -7,
      totalDeficit: 7,
      totalSurplus: 0,
      hasDeficit: true,
      forecast: {
        slot: 'ALL',
        totalTarget: 15,
        totalCommitted: 10,
        totalExcused: 2,
        totalExpectedTurnup: 8,
        totalNeeded: 7,
        overallFulfillmentPercentage: 53,
        roleBreakdown: [],
        slotBreakdowns: [
          {
            slot: '9AM',
            totalTarget: 15,
            totalCommitted: 10,
            totalExcused: 2,
            totalExpectedTurnup: 8,
            totalNeeded: 7,
            overallFulfillmentPercentage: 53,
            roleBreakdown: [
              {
                role: 'Usher',
                target: 15,
                committed: 10,
                excused: 2,
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
  ];

  it('generates a CSV with headers and row values including excused counts', () => {
    const { csvText, filename } = buildSundayForecastCsvExport({
      sundays: mockSundays,
      year: 2026,
      monthIndex: 9,
    });

    expect(filename).toBe('attendance-forecast-2026-10.csv');
    const lines = csvText.split('\n');
    expect(lines[0]).toBe(
      'Sunday Date,Sunday Label,Time Slot,Role,Target,Scheduled,Excused,Expected Turnup,Deficit,Surplus,Fulfillment Rate',
    );
    expect(lines[1]).toBe('2026-10-04,1st Sunday,9:00 AM,Usher,15,10,2,8,7,0,53%');
  });

  it('filters by selectedSundayKey when specified', () => {
    const { filename } = buildSundayForecastCsvExport({
      sundays: mockSundays,
      year: 2026,
      monthIndex: 9,
      selectedSundayKey: '2026-10-04',
    });

    expect(filename).toBe('attendance-forecast-2026-10-04.csv');
  });
});
