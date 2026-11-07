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

  it('handles multiple time slots per Sunday', () => {
    const sundayWithMultipleSlots: SundayForecastData[] = [
      {
        ...mockSundays[0],
        forecast: {
          ...mockSundays[0].forecast!,
          slotBreakdowns: [
            {
              slot: '9AM',
              totalTarget: 10,
              totalCommitted: 8,
              totalExcused: 1,
              totalExpectedTurnup: 7,
              totalNeeded: 3,
              overallFulfillmentPercentage: 70,
              roleBreakdown: [
                {
                  role: 'Usher',
                  target: 10,
                  committed: 8,
                  excused: 1,
                  expectedTurnup: 7,
                  needed: 3,
                  surplus: 0,
                  fulfillmentPercentage: 70,
                },
              ],
            },
            {
              slot: '12NN',
              totalTarget: 5,
              totalCommitted: 5,
              totalExcused: 0,
              totalExpectedTurnup: 5,
              totalNeeded: 0,
              overallFulfillmentPercentage: 100,
              roleBreakdown: [
                {
                  role: 'Usher',
                  target: 5,
                  committed: 5,
                  excused: 0,
                  expectedTurnup: 5,
                  needed: 0,
                  surplus: 0,
                  fulfillmentPercentage: 100,
                },
              ],
            },
          ],
        },
      } as unknown as SundayForecastData,
    ];

    const { csvText } = buildSundayForecastCsvExport({
      sundays: sundayWithMultipleSlots,
      year: 2026,
      monthIndex: 9,
    });

    const lines = csvText.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain('9:00 AM');
    expect(lines[2]).toContain('12:00 NN');
  });

  it('handles forecast with no slotBreakdowns by using forecast root', () => {
    const sundayWithoutSlotBreakdowns: SundayForecastData[] = [
      {
        ...mockSundays[0],
        forecast: {
          slot: 'ALL',
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
          slotBreakdowns: [],
        },
      } as unknown as SundayForecastData,
    ];

    const { csvText } = buildSundayForecastCsvExport({
      sundays: sundayWithoutSlotBreakdowns,
      year: 2026,
      monthIndex: 9,
    });

    const lines = csvText.split('\n');
    expect(lines[1]).toContain('All Sessions');
    expect(lines[1]).toContain('Usher');
  });

  it('handles unknown time slot keys by displaying the slot as-is', () => {
    const sundayWithUnknownSlot: SundayForecastData[] = [
      {
        ...mockSundays[0],
        forecast: {
          slot: 'UNKNOWN',
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
          slotBreakdowns: undefined,
        },
      } as unknown as SundayForecastData,
    ];

    const { csvText } = buildSundayForecastCsvExport({
      sundays: sundayWithUnknownSlot,
      year: 2026,
      monthIndex: 9,
    });

    const lines = csvText.split('\n');
    expect(lines[1]).toContain('UNKNOWN');
  });

  it('handles null or undefined slotGroup items by skipping them', () => {
    const sundayWithNullSlotGroup: SundayForecastData[] = [
      {
        ...mockSundays[0],
        forecast: {
          slot: 'ALL',
          totalTarget: 15,
          totalCommitted: 10,
          totalExcused: 2,
          totalExpectedTurnup: 8,
          totalNeeded: 7,
          overallFulfillmentPercentage: 53,
          roleBreakdown: [],
          slotBreakdowns: [null as unknown as never, mockSundays[0].forecast!.slotBreakdowns![0]],
        },
      } as unknown as SundayForecastData,
    ];

    const { csvText } = buildSundayForecastCsvExport({
      sundays: sundayWithNullSlotGroup,
      year: 2026,
      monthIndex: 9,
    });

    const lines = csvText.split('\n');
    expect(lines).toHaveLength(2); // header + 1 row (null item skipped)
  });

  it('calculates fulfillmentPercentage when not provided', () => {
    const sundayWithoutFulfillment: SundayForecastData[] = [
      {
        ...mockSundays[0],
        forecast: {
          slot: 'ALL',
          totalTarget: 10,
          totalCommitted: 5,
          totalExcused: 1,
          totalExpectedTurnup: 3,
          totalNeeded: 7,
          overallFulfillmentPercentage: undefined,
          roleBreakdown: [
            {
              role: 'Usher',
              target: 10,
              committed: 5,
              excused: 1,
              expectedTurnup: 3,
              needed: 7,
              surplus: 0,
              fulfillmentPercentage: undefined,
            },
          ],
          slotBreakdowns: undefined,
        },
      } as unknown as SundayForecastData,
    ];

    const { csvText } = buildSundayForecastCsvExport({
      sundays: sundayWithoutFulfillment,
      year: 2026,
      monthIndex: 9,
    });

    const lines = csvText.split('\n');
    expect(lines[1]).toContain('30%'); // Math.round((3 / 10) * 100) = 30
  });

  it('defaults fulfillmentPercentage to 100% when target is zero', () => {
    const sundayWithZeroTarget: SundayForecastData[] = [
      {
        ...mockSundays[0],
        forecast: {
          slot: 'ALL',
          totalTarget: 0,
          totalCommitted: 0,
          totalExcused: 0,
          totalExpectedTurnup: 0,
          totalNeeded: 0,
          overallFulfillmentPercentage: undefined,
          roleBreakdown: [
            {
              role: 'Usher',
              target: 0,
              committed: 0,
              excused: 0,
              expectedTurnup: 0,
              needed: 0,
              surplus: 0,
              fulfillmentPercentage: undefined,
            },
          ],
          slotBreakdowns: undefined,
        },
      } as unknown as SundayForecastData,
    ];

    const { csvText } = buildSundayForecastCsvExport({
      sundays: sundayWithZeroTarget,
      year: 2026,
      monthIndex: 9,
    });

    const lines = csvText.split('\n');
    expect(lines[1]).toContain('100%');
  });

  it('handles surplus and deficit values correctly', () => {
    const sundayWithSurplus: SundayForecastData[] = [
      {
        ...mockSundays[0],
        forecast: {
          slot: 'ALL',
          totalTarget: 10,
          totalCommitted: 15,
          totalExcused: 1,
          totalExpectedTurnup: 12,
          totalNeeded: 0,
          overallFulfillmentPercentage: 120,
          roleBreakdown: [
            {
              role: 'Usher',
              target: 10,
              committed: 15,
              excused: 1,
              expectedTurnup: 12,
              needed: 0,
              surplus: 2,
              fulfillmentPercentage: 120,
            },
          ],
          slotBreakdowns: undefined,
        },
      } as unknown as SundayForecastData,
    ];

    const { csvText } = buildSundayForecastCsvExport({
      sundays: sundayWithSurplus,
      year: 2026,
      monthIndex: 9,
    });

    const lines = csvText.split('\n');
    expect(lines[1]).toContain('0,2,120%'); // needed=0, surplus=2, fulfillment=120%
  });

  it('handles 3PM time slot correctly', () => {
    const sundayWith3PM: SundayForecastData[] = [
      {
        ...mockSundays[0],
        forecast: {
          slot: 'ALL',
          totalTarget: 5,
          totalCommitted: 5,
          totalExcused: 0,
          totalExpectedTurnup: 5,
          totalNeeded: 0,
          overallFulfillmentPercentage: 100,
          roleBreakdown: [],
          slotBreakdowns: [
            {
              slot: '3PM',
              totalTarget: 5,
              totalCommitted: 5,
              totalExcused: 0,
              totalExpectedTurnup: 5,
              totalNeeded: 0,
              overallFulfillmentPercentage: 100,
              roleBreakdown: [
                {
                  role: 'Prayer Coach',
                  target: 5,
                  committed: 5,
                  excused: 0,
                  expectedTurnup: 5,
                  needed: 0,
                  surplus: 0,
                  fulfillmentPercentage: 100,
                },
              ],
            },
          ],
        },
      } as unknown as SundayForecastData,
    ];

    const { csvText } = buildSundayForecastCsvExport({
      sundays: sundayWith3PM,
      year: 2026,
      monthIndex: 9,
    });

    const lines = csvText.split('\n');
    expect(lines[1]).toContain('3:00 PM');
  });

  it('handles multiple Sundays correctly', () => {
    const twoSundays: SundayForecastData[] = [
      mockSundays[0],
      {
        ...mockSundays[0],
        isoDateKey: '2026-10-11',
        ordinalLabel: '2nd Sunday',
        dayNumber: 11,
        forecast: {
          ...mockSundays[0].forecast!,
          roleBreakdown: [
            {
              role: 'Usher',
              target: 20,
              committed: 18,
              excused: 1,
              expectedTurnup: 15,
              needed: 5,
              surplus: 0,
              fulfillmentPercentage: 75,
            },
          ],
        },
      } as unknown as SundayForecastData,
    ];

    const { csvText } = buildSundayForecastCsvExport({
      sundays: twoSundays,
      year: 2026,
      monthIndex: 9,
    });

    const lines = csvText.split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toContain('2026-10-04');
    expect(lines[2]).toContain('2026-10-11');
  });

  it('filters to single Sunday when selectedSundayKey is not ALL', () => {
    const twoSundays: SundayForecastData[] = [
      mockSundays[0],
      {
        ...mockSundays[0],
        isoDateKey: '2026-10-11',
        ordinalLabel: '2nd Sunday',
        dayNumber: 11,
      } as unknown as SundayForecastData,
    ];

    const { csvText, filename } = buildSundayForecastCsvExport({
      sundays: twoSundays,
      year: 2026,
      monthIndex: 9,
      selectedSundayKey: '2026-10-11',
    });

    expect(filename).toBe('attendance-forecast-2026-10-11.csv');
    const lines = csvText.split('\n');
    expect(lines).toHaveLength(2); // header + 1 row
    expect(lines[1]).toContain('2026-10-11');
  });
});
