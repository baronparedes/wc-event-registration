import { useMemo } from 'react';

import { format } from 'date-fns';

import {
  type MemberScheduleEntry,
  type SundayKey,
  type TimeSlot,
  useAdminMembersSchedulesQuery,
  useGetExcusedMembers,
  useMembersAttendanceScoresQuery,
} from '@/hooks/domain/members';
import { SUNDAY_KEYS, buildExcusedMap, toIsoDateKey } from '@/lib/domain/hub-calendar';
import {
  type ConfidenceThresholds,
  DEFAULT_CONFIDENCE_THRESHOLDS,
} from '@/pages/admin/hub-calendar/utils/hubCalendarForecastUtils';
import {
  DEFAULT_VOLUNTEER_TARGETS_BY_SLOT,
  type SlotStaffingForecast,
  type VolunteerTargetsBySlot,
  calculateAllSundayStaffingNeeds,
  calculateSlotStaffingNeeds,
} from '@/pages/admin/hub-calendar/utils/volunteerStaffingUtils';

export type SundayForecastData = {
  date: Date;
  dayNumber: number;
  isoDateKey: string;
  sundayKey: SundayKey;
  ordinalLabel: string;
  formattedDate: string;
  entriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]>;
  totalScheduled: number;
  forecast: SlotStaffingForecast;
};

export type MonthForecastSummary = {
  totalSundays: number;
  totalTarget: number;
  totalExpectedTurnup: number;
  totalNeeded: number;
  averageFulfillmentPercentage: number;
  sundaysMeetingTarget: number;
  sundaysWithDeficit: number;
};

export type UseAttendanceForecastDataParams = {
  viewYear: number;
  viewMonthIndex: number;
  activeSlot: TimeSlot | 'ALL';
  targets?: VolunteerTargetsBySlot;
  thresholds?: ConfidenceThresholds;
};

const SUNDAY_ORDINALS = ['1st Sunday', '2nd Sunday', '3rd Sunday', '4th Sunday', '5th Sunday'];

export function getSundaysOfMonth(year: number, monthIndex: number) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const sundays: {
    date: Date;
    dayNumber: number;
    isoDateKey: string;
    sundayKey: SundayKey;
    ordinalLabel: string;
    formattedDate: string;
  }[] = [];

  let sundayIndex = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, monthIndex, day);
    if (date.getDay() === 0) {
      const sundayKey = SUNDAY_KEYS[sundayIndex] ?? 'fifth_sunday';
      const ordinalLabel = SUNDAY_ORDINALS[sundayIndex] ?? `${sundayIndex + 1}th Sunday`;
      sundays.push({
        date,
        dayNumber: day,
        isoDateKey: toIsoDateKey(year, monthIndex + 1, day),
        sundayKey,
        ordinalLabel,
        formattedDate: format(date, 'MMMM d, yyyy'),
      });
      sundayIndex++;
    }
  }

  return sundays;
}

export function useAttendanceForecastData({
  viewYear,
  viewMonthIndex,
  activeSlot,
  targets = DEFAULT_VOLUNTEER_TARGETS_BY_SLOT,
  thresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
}: UseAttendanceForecastDataParams) {
  const schedulesQuery = useAdminMembersSchedulesQuery();
  const attendanceScoresQuery = useMembersAttendanceScoresQuery();
  const { data: excusedMembersArray = [], ...excusedQuery } = useGetExcusedMembers(
    viewYear,
    viewMonthIndex,
  );

  const scheduleEntries = useMemo(() => schedulesQuery.data ?? [], [schedulesQuery.data]);
  const attendanceScoreMap = attendanceScoresQuery.data;

  const excusedMap = useMemo(() => {
    return buildExcusedMap(excusedMembersArray, viewYear, viewMonthIndex);
  }, [excusedMembersArray, viewYear, viewMonthIndex]);

  const sundaysList = useMemo(() => {
    return getSundaysOfMonth(viewYear, viewMonthIndex);
  }, [viewYear, viewMonthIndex]);

  const sundayForecasts = useMemo<SundayForecastData[]>(() => {
    return sundaysList.map((sunday) => {
      const matchingEntries = scheduleEntries.filter(
        (entry) => entry.sundayKey === sunday.sundayKey,
      );

      const entriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]> = {
        '9AM': [],
        '12NN': [],
        '3PM': [],
      };

      for (const entry of matchingEntries) {
        for (const slot of entry.timeSlots) {
          entriesByTimeSlot[slot].push(entry);
        }
      }

      const forecast =
        activeSlot === 'ALL'
          ? calculateAllSundayStaffingNeeds(
              entriesByTimeSlot,
              excusedMap,
              sunday.isoDateKey,
              targets,
              attendanceScoreMap,
              thresholds,
            )
          : calculateSlotStaffingNeeds(
              entriesByTimeSlot[activeSlot] || [],
              excusedMap,
              sunday.isoDateKey,
              activeSlot,
              targets[activeSlot] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT[activeSlot],
              attendanceScoreMap,
              thresholds,
            );

      const totalScheduled =
        activeSlot === 'ALL'
          ? matchingEntries.length
          : (entriesByTimeSlot[activeSlot] || []).length;

      return {
        ...sunday,
        entriesByTimeSlot,
        totalScheduled,
        forecast,
      };
    });
  }, [
    sundaysList,
    scheduleEntries,
    activeSlot,
    excusedMap,
    targets,
    attendanceScoreMap,
    thresholds,
  ]);

  const monthSummary = useMemo<MonthForecastSummary>(() => {
    let totalTarget = 0;
    let totalExpectedTurnup = 0;
    let totalNeeded = 0;
    let sundaysMeetingTarget = 0;
    let sundaysWithDeficit = 0;

    for (const item of sundayForecasts) {
      totalTarget += item.forecast.totalTarget;
      totalExpectedTurnup += item.forecast.totalExpectedTurnup;
      totalNeeded += item.forecast.totalNeeded;

      if (item.forecast.totalNeeded === 0 && item.forecast.totalTarget > 0) {
        sundaysMeetingTarget++;
      } else if (item.forecast.totalNeeded > 0) {
        sundaysWithDeficit++;
      }
    }

    const averageFulfillmentPercentage =
      totalTarget > 0 ? Math.min(100, Math.round((totalExpectedTurnup / totalTarget) * 100)) : 100;

    return {
      totalSundays: sundayForecasts.length,
      totalTarget,
      totalExpectedTurnup,
      totalNeeded,
      averageFulfillmentPercentage,
      sundaysMeetingTarget,
      sundaysWithDeficit,
    };
  }, [sundayForecasts]);

  const isLoading =
    schedulesQuery.isLoading || attendanceScoresQuery.isLoading || excusedQuery.isLoading;
  const isError =
    Boolean(schedulesQuery.error) ||
    Boolean(attendanceScoresQuery.error) ||
    Boolean(excusedQuery.error);
  const error = schedulesQuery.error || attendanceScoresQuery.error || excusedQuery.error;

  const refetch = () => {
    void schedulesQuery.refetch();
    void attendanceScoresQuery.refetch();
    void excusedQuery.refetch();
  };

  return {
    sundayForecasts,
    monthSummary,
    isLoading,
    isError,
    error,
    refetch,
    excusedMap,
    attendanceScoreMap,
  };
}
