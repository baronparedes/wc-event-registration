import { faker } from '@faker-js/faker';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MemberScheduleEntry } from '@/hooks/domain/members';
import type { AdminMember } from '@/lib/domain/members';

import {
  getForecastEvaluationWindow,
  getSundaysOfMonth,
  useAttendanceForecastData,
} from '../useAttendanceForecastData';

const {
  mockUseAdminMembersSchedulesQuery,
  mockUseMembersAttendanceScoresQuery,
  mockUseGetExcusedMembers,
} = vi.hoisted(() => ({
  mockUseAdminMembersSchedulesQuery: vi.fn(),
  mockUseMembersAttendanceScoresQuery: vi.fn(),
  mockUseGetExcusedMembers: vi.fn(),
}));

vi.mock('@/hooks/domain/members', () => ({
  useAdminMembersSchedulesQuery: () => mockUseAdminMembersSchedulesQuery(),
  useMembersAttendanceScoresQuery: (...args: unknown[]) =>
    mockUseMembersAttendanceScoresQuery(...args),
  useGetExcusedMembers: (...args: unknown[]) => mockUseGetExcusedMembers(...args),
}));

describe('getForecastEvaluationWindow', () => {
  it('returns the 3 months window immediately preceding the selected month', () => {
    // October 2026 (index 9) -> 2026-07-01 to 2026-09-30
    const window = getForecastEvaluationWindow(2026, 9);
    expect(window.startDate).toBe('2026-07-01');
    expect(window.endDate).toBe('2026-09-30');
  });

  it('handles year boundaries correctly for January', () => {
    // January 2027 (index 0) -> 2026-10-01 to 2026-12-31
    const window = getForecastEvaluationWindow(2027, 0);
    expect(window.startDate).toBe('2026-10-01');
    expect(window.endDate).toBe('2026-12-31');
  });
});

describe('getSundaysOfMonth', () => {
  it('returns all 4 Sundays for October 2026', () => {
    // October 2026: Oct 4, 11, 18, 25 are Sundays
    const sundays = getSundaysOfMonth(2026, 9);
    expect(sundays).toHaveLength(4);
    expect(sundays[0].dayNumber).toBe(4);
    expect(sundays[0].ordinalLabel).toBe('1st Sunday');
    expect(sundays[0].sundayKey).toBe('first_sunday');
    expect(sundays[0].isoDateKey).toBe('2026-10-04');

    expect(sundays[1].dayNumber).toBe(11);
    expect(sundays[1].ordinalLabel).toBe('2nd Sunday');
    expect(sundays[1].sundayKey).toBe('second_sunday');

    expect(sundays[2].dayNumber).toBe(18);
    expect(sundays[2].ordinalLabel).toBe('3rd Sunday');
    expect(sundays[2].sundayKey).toBe('third_sunday');

    expect(sundays[3].dayNumber).toBe(25);
    expect(sundays[3].ordinalLabel).toBe('4th Sunday');
    expect(sundays[3].sundayKey).toBe('fourth_sunday');
  });

  it('returns all 5 Sundays for May 2026', () => {
    // May 2026: May 3, 10, 17, 24, 31 are Sundays
    const sundays = getSundaysOfMonth(2026, 4);
    expect(sundays).toHaveLength(5);
    expect(sundays[0].dayNumber).toBe(3);
    expect(sundays[4].dayNumber).toBe(31);
    expect(sundays[4].ordinalLabel).toBe('5th Sunday');
    expect(sundays[4].sundayKey).toBe('fifth_sunday');
  });
});

describe('useAttendanceForecastData', () => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  const dummyMember: AdminMember = {
    id: 'user-1',
    member_id: 'MEM-001',
    avatar_object_key: null,
    is_active: true,
    first_name: firstName,
    last_name: lastName,
    nickname: faker.person.firstName(),
    full_name: `${firstName} ${lastName}`,
    email: faker.internet.exampleEmail({ firstName, lastName }),
    phone: '123-456',
    date_of_birth: '1990-01-01',
    category: 'adult',
    role: 'Usher',
    extra_metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const scheduleEntries: MemberScheduleEntry[] = [
    {
      sundayKey: 'first_sunday',
      timeSlots: ['9AM'],
      member: dummyMember,
    },
    {
      sundayKey: 'second_sunday',
      timeSlots: ['9AM', '12NN'],
      member: dummyMember,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdminMembersSchedulesQuery.mockReturnValue({
      data: scheduleEntries,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseMembersAttendanceScoresQuery.mockReturnValue({
      data: new Map([['user-1', { turnupRate: 0.9, attendedCount: 9, totalCount: 10 }]]),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
    mockUseGetExcusedMembers.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('calculates sunday forecasts and month summary for all slots', () => {
    const { result } = renderHook(() =>
      useAttendanceForecastData({
        viewYear: 2026,
        viewMonthIndex: 9, // October
        activeSlot: 'ALL',
      }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.sundayForecasts).toHaveLength(4);
    expect(mockUseMembersAttendanceScoresQuery).toHaveBeenCalledWith({
      dateRange: { startDate: '2026-07-01', endDate: '2026-09-30' },
    });
    expect(result.current.evaluationWindow).toEqual({
      startDate: '2026-07-01',
      endDate: '2026-09-30',
    });

    // 1st Sunday has 1 scheduled member in 9AM
    const firstSunday = result.current.sundayForecasts[0];
    expect(firstSunday.totalScheduled).toBe(1);
    expect(firstSunday.entriesByTimeSlot['9AM']).toHaveLength(1);
    expect(firstSunday.entriesByTimeSlot['12NN']).toHaveLength(0);

    // Month summary calculations
    expect(result.current.monthSummary.totalSundays).toBe(4);
    expect(result.current.monthSummary.totalTarget).toBeGreaterThan(0);
    expect(typeof result.current.monthSummary.totalExpectedTurnup).toBe('number');
  });

  it('filters by single time slot properly', () => {
    const { result } = renderHook(() =>
      useAttendanceForecastData({
        viewYear: 2026,
        viewMonthIndex: 9,
        activeSlot: '12NN',
      }),
    );

    // 1st Sunday has 0 scheduled members for 12NN
    const firstSunday = result.current.sundayForecasts[0];
    expect(firstSunday.totalScheduled).toBe(0);

    // 2nd Sunday has 1 scheduled member for 12NN
    const secondSunday = result.current.sundayForecasts[1];
    expect(secondSunday.totalScheduled).toBe(1);
  });

  it('incorporates excused members into forecasts', () => {
    mockUseGetExcusedMembers.mockReturnValue({
      data: [
        {
          userId: 'user-1',
          memberId: 'MEM-001',
          requestDate: '2026-10-04',
          services: '9AM',
          reason: 'Out of town',
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useAttendanceForecastData({
        viewYear: 2026,
        viewMonthIndex: 9,
        activeSlot: '9AM',
      }),
    );

    const firstSunday = result.current.sundayForecasts[0];
    expect(firstSunday.forecast.totalExcused).toBe(1);
  });

  it('handles loading and error states', () => {
    mockUseAdminMembersSchedulesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { result } = renderHook(() =>
      useAttendanceForecastData({
        viewYear: 2026,
        viewMonthIndex: 9,
        activeSlot: 'ALL',
      }),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
  });

  it('computes session-level forecasts (9AM, 12NN, 3PM) and totals for Usher', () => {
    const { result } = renderHook(() =>
      useAttendanceForecastData({
        viewYear: 2026,
        viewMonthIndex: 9,
        activeRoleGroup: 'USHER',
      }),
    );

    const firstSunday = result.current.sundayForecasts[0];
    expect(firstSunday.sessions).toHaveLength(3);

    const nineAmSession = firstSunday.sessions.find((s) => s.slot === '9AM')!;
    expect(nineAmSession).toBeDefined();
    // dummyMember is Usher with 9AM commitment on 1st Sunday
    expect(nineAmSession.scheduled).toBe(1);
    expect(nineAmSession.confirmed).toBe(1); // turnup rate 0.9 -> round(0.9) = 1
    // Usher target is 17
    expect(nineAmSession.target).toBe(17);
    expect(nineAmSession.overShort).toBe(1 - 17); // -16

    expect(result.current.selectedRoleGroup.tableTitle).toBe('USHER COMMITMENTS');
  });

  it('filters by Prayer Coach role group when activeRoleGroup is PRAYER_COACH', () => {
    const { result } = renderHook(() =>
      useAttendanceForecastData({
        viewYear: 2026,
        viewMonthIndex: 9,
        activeRoleGroup: 'PRAYER_COACH',
      }),
    );

    const firstSunday = result.current.sundayForecasts[0];
    const nineAmSession = firstSunday.sessions.find((s) => s.slot === '9AM')!;
    // dummyMember is an Usher, so for Prayer Coach scheduled count is 0
    expect(nineAmSession.scheduled).toBe(0);
    expect(nineAmSession.confirmed).toBe(0);
    expect(nineAmSession.target).toBe(50); // Default PC target for 9AM
    expect(nineAmSession.overShort).toBe(-50);
  });
});
