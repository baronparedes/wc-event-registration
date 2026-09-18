import { useMemo, useState } from 'react';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

import { Badge, Button, EmptyState, FormSelectField, SectionCard } from '@/components/ui';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { useServiceAttendanceQuery } from '@/hooks/domain/services';
import type { ServiceAttendance, ServiceAttendanceSeat } from '@/lib/domain/services';
import { formatDateTime } from '@/lib/infrastructure';

interface ServiceAttendanceHistoryTabProps {
  memberId: string;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatAssignedSeat(seat?: ServiceAttendanceSeat | null): string {
  if (!seat || !seat.table_number || seat.table_number.toLowerCase() === 'unassigned') {
    return 'Unassigned';
  }

  const parts = [seat.table_number];
  if (seat.seat_number) {
    parts.push(`Seat ${seat.seat_number}`);
  }
  if (seat.area) {
    parts.push(`(${seat.area})`);
  }

  return parts.join(', ');
}

function renderStatusBadge(record: ServiceAttendance) {
  if (record.is_walk_in) {
    return (
      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
        Walk-in
      </span>
    );
  }
  if (record.is_override) {
    return (
      <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-700/10">
        Override
      </span>
    );
  }
  if (record.is_manual_entry) {
    return (
      <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
        Manual
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
      Regular
    </span>
  );
}

export function ServiceAttendanceHistoryTab({ memberId }: ServiceAttendanceHistoryTabProps) {
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

  const {
    data: attendance = [],
    isLoading,
    isFetching,
    isError,
  } = useServiceAttendanceQuery({
    user_id: memberId,
    start_date: startDateStr,
    end_date: endDateStr,
  });

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
      title="Service Attendance History"
      subtitle="View your service attendance by month."
      headerAction={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleToday}
              disabled={isAtToday}
              className="h-10 flex-1 font-semibold shadow-xs sm:flex-initial"
            >
              Today
            </Button>

            <div className="flex-1 sm:flex-initial sm:w-28">
              <FormSelectField
                ariaLabel="Select year"
                value={String(viewYear)}
                onChange={handleSelectYear}
                placeholder=""
                options={years.map((y) => ({
                  value: String(y),
                  label: String(y),
                }))}
                selectClassName="h-10 py-2 border-border bg-surface font-semibold text-text shadow-xs"
              />
            </div>
          </div>

          <div className="flex w-full items-center justify-between rounded-lg border border-border bg-surface sm:w-auto">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePreviousMonth}
              aria-label="Previous month"
              disabled={viewMonthIndex === 0}
              className="h-10 w-10 shrink-0 px-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="min-w-[110px] flex-1 px-3 text-center text-sm font-semibold text-text sm:flex-initial">
              {monthOnlyName}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleNextMonth}
              aria-label="Next month"
              disabled={viewMonthIndex === 11}
              className="h-10 w-10 shrink-0 px-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      }
    >
      <div className="mt-4">
        {isInitialLoading && <p className="text-sm text-muted">Loading attendance history...</p>}
        {isError && attendance.length === 0 && (
          <p className="text-sm text-red-600">Failed to load attendance history.</p>
        )}

        {!isInitialLoading && (!isError || attendance.length > 0) && (
          <div
            className={`space-y-4 transition-opacity duration-150 ${
              isFetching ? 'opacity-70' : 'opacity-100'
            }`}
          >
            {attendance.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-8 w-8 text-primary" />}
                title="No attendance found"
                description={`No service attendance recorded for ${fullMonthName}.`}
              />
            ) : (
              <>
                {/* Month Summary Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface/50 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-text">
                      {`${attendance.length} service${attendance.length === 1 ? '' : 's'} attended in ${fullMonthName}`}
                    </span>
                    {isFetching && (
                      <span className="text-xs text-muted animate-pulse font-normal">
                        (updating...)
                      </span>
                    )}
                  </div>
                  <Badge variant="success">{attendance.length} Total</Badge>
                </div>

                {/* Mobile View: Cards */}
                <div className="space-y-2 sm:hidden">
                  {attendance.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-sm text-primary">
                          {record.time_slot}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-text truncate">
                            {record.service_date}
                          </div>
                          <div className="text-xs text-muted truncate">
                            {formatAssignedSeat(record.service_seats)} •{' '}
                            {formatDateTime(record.checked_in_at)}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0">{renderStatusBadge(record)}</div>
                    </div>
                  ))}
                </div>

                {/* Desktop View: ListTable */}
                <div className="hidden sm:block overflow-hidden rounded-xl border border-border bg-surface shadow-xs">
                  <ListTable>
                    <ListTableHead>
                      <ListTableHeaderRow>
                        <ListTableHeaderCell>Service Date</ListTableHeaderCell>
                        <ListTableHeaderCell>Time Slot</ListTableHeaderCell>
                        <ListTableHeaderCell>Assignment</ListTableHeaderCell>
                        <ListTableHeaderCell>Checked In At</ListTableHeaderCell>
                        <ListTableHeaderCell>Status</ListTableHeaderCell>
                      </ListTableHeaderRow>
                    </ListTableHead>
                    <ListTableBody>
                      {attendance.map((record) => (
                        <ListTableRow key={record.id}>
                          <ListTableCell className="font-medium text-text">
                            {record.service_date}
                          </ListTableCell>
                          <ListTableCell>{record.time_slot}</ListTableCell>
                          <ListTableCell>
                            <span
                              className={
                                record.service_seats ? 'text-text font-medium' : 'text-muted'
                              }
                            >
                              {formatAssignedSeat(record.service_seats)}
                            </span>
                          </ListTableCell>
                          <ListTableCell>{formatDateTime(record.checked_in_at)}</ListTableCell>
                          <ListTableCell>{renderStatusBadge(record)}</ListTableCell>
                        </ListTableRow>
                      ))}
                    </ListTableBody>
                  </ListTable>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
