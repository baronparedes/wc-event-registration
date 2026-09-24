import { useMemo, useState } from 'react';

import { SectionCard } from '@/components/ui';
import { useGetMemberExcusedSchedule } from '@/hooks/domain/members';
import { useServiceAttendanceQuery, useUserCommitmentHistoryQuery } from '@/hooks/domain/services';
import {
  MATRIX_TIME_SLOTS,
  SERVICE_SUNDAY_KEYS,
  computeMatrixGrid,
  getMonthSundays,
  getNonSundayAttendances,
  toISODate,
} from '@/lib/domain/services';

import {
  NonSundayAttendanceList,
  ServiceAttendanceDesktopMatrix,
  ServiceAttendanceHeaderControls,
  ServiceAttendanceLegend,
  ServiceAttendanceMobileCards,
  ServiceAttendanceMonthSummary,
} from './service-attendance';

interface ServiceAttendanceHistoryTabProps {
  memberId: string;
  metadata?: Record<string, string>;
  isAdminView?: boolean;
}

export function ServiceAttendanceHistoryTab({
  memberId,
  metadata,
}: ServiceAttendanceHistoryTabProps) {
  const today = useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const viewYear = viewDate.getFullYear();
  const viewMonthIndex = viewDate.getMonth();

  const isAtToday = viewYear === today.getFullYear() && viewMonthIndex === today.getMonth();

  const firstDayOfMonth = useMemo(
    () => new Date(viewYear, viewMonthIndex, 1),
    [viewYear, viewMonthIndex],
  );
  const lastDayOfMonth = useMemo(
    () => new Date(viewYear, viewMonthIndex + 1, 0),
    [viewYear, viewMonthIndex],
  );

  const startDateStr = useMemo(() => toISODate(firstDayOfMonth), [firstDayOfMonth]);
  const endDateStr = useMemo(() => toISODate(lastDayOfMonth), [lastDayOfMonth]);

  const attendanceQuery = useServiceAttendanceQuery({
    user_id: memberId,
    start_date: startDateStr,
    end_date: endDateStr,
  });
  const attendance = useMemo(
    () => attendanceQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [attendanceQuery.data],
  );
  const isAttendanceLoading = attendanceQuery.isLoading;
  const isAttendanceFetching = attendanceQuery.isFetching;
  const isAttendanceError = Boolean(attendanceQuery.isError);

  const {
    data: snapshots = [],
    isLoading: isSnapshotsLoading,
    isFetching: isSnapshotsFetching,
    isError: isSnapshotsError,
  } = useUserCommitmentHistoryQuery(memberId);

  const isLoading = isAttendanceLoading || isSnapshotsLoading;
  const isFetching = isAttendanceFetching || isSnapshotsFetching;
  const isError = isAttendanceError || isSnapshotsError;
  const isLoadingAttendance = isAttendanceLoading;

  const memberScheduleQuery = useGetMemberExcusedSchedule(viewYear, viewMonthIndex, memberId);

  const isExcusedLoading =
    memberScheduleQuery.isLoading ||
    memberScheduleQuery.isPlaceholderData ||
    memberScheduleQuery.isFetching ||
    memberScheduleQuery.data === undefined;

  const excusedRecords = useMemo(() => memberScheduleQuery.data || [], [memberScheduleQuery.data]);

  const isInitialLoading = isLoading && attendance.length === 0;

  const currentYear = today.getFullYear();
  const years = useMemo(() => {
    const startYear = 2025;
    const maxYear = Math.max(currentYear + 1, viewYear);
    const minYear = Math.min(startYear, viewYear);
    return Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  }, [currentYear, viewYear]);

  const monthOnlyName = viewDate.toLocaleDateString(undefined, { month: 'long' });
  const fullMonthName = `${monthOnlyName} ${viewYear}`;

  const sundays = useMemo(
    () => getMonthSundays(viewYear, viewMonthIndex),
    [viewYear, viewMonthIndex],
  );

  const todayStr = useMemo(() => toISODate(today), [today]);

  const matrixGrid = useMemo(
    () =>
      computeMatrixGrid(
        sundays,
        attendance,
        metadata,
        snapshots,
        excusedRecords,
        todayStr,
        isLoadingAttendance,
        isExcusedLoading,
      ),
    [
      sundays,
      attendance,
      metadata,
      snapshots,
      excusedRecords,
      todayStr,
      isLoadingAttendance,
      isExcusedLoading,
    ],
  );

  const nonSundayAttendances = useMemo(
    () => (!isLoadingAttendance ? getNonSundayAttendances(attendance, sundays) : []),
    [attendance, sundays, isLoadingAttendance],
  );

  const missedCount = useMemo(() => {
    let count = 0;
    for (const key of SERVICE_SUNDAY_KEYS) {
      for (const slot of MATRIX_TIME_SLOTS) {
        if (matrixGrid[key]?.[slot]?.status === 'missed_committed') {
          count++;
        }
      }
    }
    return count;
  }, [matrixGrid]);

  const handlePreviousMonth = () => {
    if (viewMonthIndex > 0) {
      setViewDate(new Date(viewYear, viewMonthIndex - 1, 1));
    }
  };

  const handleNextMonth = () => {
    if (viewMonthIndex < 11) {
      setViewDate(new Date(viewYear, viewMonthIndex + 1, 1));
    }
  };

  const handleToday = () => {
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  };

  const handleSelectYear = (selectedYearStr: string) => {
    const selectedYear = Number.parseInt(selectedYearStr, 10);
    if (!Number.isNaN(selectedYear)) {
      setViewDate(new Date(selectedYear, viewMonthIndex, 1));
    }
  };

  return (
    <SectionCard
      title="Service Commitment History"
      subtitle="View your service attendance by month."
      headerAction={
        <ServiceAttendanceHeaderControls
          viewYear={viewYear}
          viewMonthIndex={viewMonthIndex}
          monthOnlyName={monthOnlyName}
          isAtToday={isAtToday}
          years={years}
          onToday={handleToday}
          onSelectYear={handleSelectYear}
          onPreviousMonth={handlePreviousMonth}
          onNextMonth={handleNextMonth}
        />
      }
    >
      <div className="mt-4">
        {isInitialLoading && <p className="text-base text-muted">Loading attendance history...</p>}
        {isError && attendance.length === 0 && (
          <p className="text-base text-danger">Failed to load attendance history.</p>
        )}

        {!isInitialLoading && (!isError || attendance.length > 0) && (
          <div
            className={`space-y-4 transition-opacity duration-150 ${
              isFetching ? 'opacity-70' : 'opacity-100'
            }`}
          >
            <ServiceAttendanceMonthSummary
              attendanceCount={attendance.length}
              fullMonthName={fullMonthName}
              missedCount={missedCount}
              isFetching={isFetching}
            />
            <ServiceAttendanceLegend />
            <ServiceAttendanceMobileCards sundays={sundays} matrixGrid={matrixGrid} />
            <ServiceAttendanceDesktopMatrix sundays={sundays} matrixGrid={matrixGrid} />
            {!isLoadingAttendance && <NonSundayAttendanceList records={nonSundayAttendances} />}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
