import { useMemo } from 'react';

import { format, subDays, subMonths } from 'date-fns';

import {
  type MemberScheduleEntry,
  type SundayKey,
  type TimeSlot,
  useAdminMembersSchedulesQuery,
  useGetExcusedMembers,
  useMembersAttendanceScoresQuery,
} from '@/hooks/domain/members';
import {
  SUNDAY_KEYS,
  buildExcusedMap,
  isMemberExcused,
  toIsoDateKey,
} from '@/lib/domain/hub-calendar';
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
  normalizeStaffingRole,
} from '@/pages/admin/hub-calendar/utils/volunteerStaffingUtils';

export type ForecastRoleGroup =
  | 'USHER_BACKROOM'
  | 'PRAYER_COACH'
  | 'IMT_VMT'
  | 'ALL'
  | 'USHER'
  | 'BACKROOM';

export interface RoleGroupOption {
  id: ForecastRoleGroup;
  label: string;
  tableTitle: string;
  roles: string[];
}

export const FORECAST_ROLE_GROUPS: RoleGroupOption[] = [
  {
    id: 'USHER_BACKROOM',
    label: 'Usher & Backroom',
    tableTitle: 'USHER/BACKROOM COMMITMENTS',
    roles: ['Usher', 'Backroom Support'],
  },
  {
    id: 'PRAYER_COACH',
    label: 'Prayer Coach',
    tableTitle: 'PRAYER COACH COMMITMENTS',
    roles: ['Prayer Coach'],
  },
  {
    id: 'IMT_VMT',
    label: 'IMT & VMT',
    tableTitle: 'IMT/VMT COMMITMENTS',
    roles: ['IMT Support', 'VMT Support'],
  },
  {
    id: 'ALL',
    label: 'All Roles',
    tableTitle: 'ALL VOLUNTEER COMMITMENTS',
    roles: ['Usher', 'Backroom Support', 'Prayer Coach', 'IMT Support', 'VMT Support'],
  },
  {
    id: 'USHER',
    label: 'Usher Only',
    tableTitle: 'USHER COMMITMENTS',
    roles: ['Usher'],
  },
  {
    id: 'BACKROOM',
    label: 'Backroom Only',
    tableTitle: 'BACKROOM COMMITMENTS',
    roles: ['Backroom Support'],
  },
];

export interface SundaySessionForecast {
  slot: TimeSlot;
  target: number;
  scheduled: number;
  confirmed: number; // expected turnup
  overShort: number; // confirmed - target
}

export type SundayForecastData = {
  date: Date;
  dayNumber: number;
  isoDateKey: string;
  sundayKey: SundayKey;
  ordinalLabel: string;
  formattedDate: string;
  entriesByTimeSlot: Record<TimeSlot, MemberScheduleEntry[]>;
  totalScheduled: number;
  sessions: SundaySessionForecast[];
  totalTarget: number;
  totalConfirmed: number;
  totalOverShort: number;
  hasDeficit: boolean;
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
  activeSlot?: TimeSlot | 'ALL';
  activeRoleGroup?: ForecastRoleGroup;
  targets?: VolunteerTargetsBySlot;
  thresholds?: ConfidenceThresholds;
};

const SUNDAY_ORDINALS = ['1st Sunday', '2nd Sunday', '3rd Sunday', '4th Sunday', '5th Sunday'];

export function getForecastEvaluationWindow(viewYear: number, viewMonthIndex: number) {
  const monthStart = new Date(viewYear, viewMonthIndex, 1);
  const endDate = format(subDays(monthStart, 1), 'yyyy-MM-dd');
  const startDate = format(subMonths(monthStart, 3), 'yyyy-MM-dd');
  return { startDate, endDate };
}

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
  activeSlot = 'ALL',
  activeRoleGroup = 'USHER_BACKROOM',
  targets = DEFAULT_VOLUNTEER_TARGETS_BY_SLOT,
  thresholds = DEFAULT_CONFIDENCE_THRESHOLDS,
}: UseAttendanceForecastDataParams) {
  const evaluationWindow = useMemo(() => {
    return getForecastEvaluationWindow(viewYear, viewMonthIndex);
  }, [viewYear, viewMonthIndex]);

  const selectedRoleGroup = useMemo(() => {
    return (
      FORECAST_ROLE_GROUPS.find((group) => group.id === activeRoleGroup) ?? FORECAST_ROLE_GROUPS[0]
    );
  }, [activeRoleGroup]);

  const schedulesQuery = useAdminMembersSchedulesQuery();
  const attendanceScoresQuery = useMembersAttendanceScoresQuery({
    dateRange: evaluationWindow,
  });
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
    const timeSlots: TimeSlot[] = ['9AM', '12NN', '3PM'];

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

      // Calculate session-level forecast for 9AM, 12NN, 3PM
      const sessions: SundaySessionForecast[] = timeSlots.map((slot) => {
        const slotTargets = targets[slot] ?? DEFAULT_VOLUNTEER_TARGETS_BY_SLOT[slot];

        // Determine target for selected role group
        let sessionTarget = 0;
        if (selectedRoleGroup.id === 'ALL') {
          sessionTarget = Object.values(slotTargets).reduce((acc, val) => acc + val, 0);
        } else {
          for (const role of selectedRoleGroup.roles) {
            sessionTarget += slotTargets[role] ?? 0;
          }
        }

        // Filter scheduled entries matching the selected role group
        const slotEntries = entriesByTimeSlot[slot] || [];
        const relevantEntries = slotEntries.filter((entry) => {
          if (selectedRoleGroup.id === 'ALL') return true;
          const normalized = normalizeStaffingRole(entry.member.role);
          return selectedRoleGroup.roles.includes(normalized);
        });

        const scheduled = relevantEntries.length;

        // Sum turnup probabilities for non-excused entries
        let probSum = 0;
        for (const entry of relevantEntries) {
          if (isMemberExcused(excusedMap, sunday.isoDateKey, entry.member, slot)) {
            continue;
          }
          const stat = attendanceScoreMap?.get(entry.member.id);
          const rate = stat !== undefined ? stat.turnupRate : thresholds.defaultTurnupRate;
          probSum += rate;
        }

        const confirmed = Math.round(probSum);
        const overShort = confirmed - sessionTarget;

        return {
          slot,
          target: sessionTarget,
          scheduled,
          confirmed,
          overShort,
        };
      });

      const totalTarget = sessions.reduce((acc, s) => acc + s.target, 0);
      const totalConfirmed = sessions.reduce((acc, s) => acc + s.confirmed, 0);
      const totalOverShort = totalConfirmed - totalTarget;
      const hasDeficit = totalOverShort < 0;

      // Legacy fallback forecast for slot view if still used
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
        sessions,
        totalTarget,
        totalConfirmed,
        totalOverShort,
        hasDeficit,
        forecast,
      };
    });
  }, [
    sundaysList,
    scheduleEntries,
    selectedRoleGroup,
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
      totalTarget += item.totalTarget;
      totalExpectedTurnup += item.totalConfirmed;
      if (item.totalOverShort < 0) {
        totalNeeded += Math.abs(item.totalOverShort);
        sundaysWithDeficit++;
      } else if (item.totalTarget > 0) {
        sundaysMeetingTarget++;
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
    selectedRoleGroup,
    isLoading,
    isError,
    error,
    refetch,
    excusedMap,
    attendanceScoreMap,
    evaluationWindow,
  };
}
