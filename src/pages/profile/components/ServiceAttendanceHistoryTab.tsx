import { useState } from 'react';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import { SectionCard } from '@/components/ui/SectionCard';
import { useServiceAttendanceQuery } from '@/hooks/domain/services';
import { formatDateTime } from '@/lib/infrastructure';

interface ServiceAttendanceHistoryTabProps {
  memberId: string;
}

function getStartOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // adjust when day is sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getEndOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() + (6 - day);
  d.setDate(diff);
  d.setHours(23, 59, 59, 999);
  return d;
}

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ServiceAttendanceHistoryTab({ memberId }: ServiceAttendanceHistoryTabProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const startOfWeek = getStartOfWeek(currentDate);
  const endOfWeek = getEndOfWeek(currentDate);

  const startDateStr = toISODate(startOfWeek);
  const endDateStr = toISODate(endOfWeek);

  // Array of years from 2020 to current + 1
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2020 + 2 }, (_, i) => 2020 + i);

  const {
    data: attendance,
    isLoading,
    isError,
  } = useServiceAttendanceQuery({
    user_id: memberId,
    start_date: startDateStr,
    end_date: endDateStr,
  });

  const handlePrevWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const handleNextWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = parseInt(e.target.value, 10);
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setFullYear(year);
      return d;
    });
  };

  return (
    <SectionCard
      title="Service Attendance History"
      subtitle="View your service attendance by week."
      headerAction={
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={currentDate.getFullYear()}
            onChange={handleYearChange}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <div className="flex items-center rounded-lg border border-border bg-background">
            <button
              onClick={handlePrevWeek}
              className="flex h-8 w-8 items-center justify-center rounded-l-lg text-muted transition hover:bg-muted/10 hover:text-text"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-3 text-sm font-medium text-text border-x border-border">
              {startOfWeek.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} -{' '}
              {endOfWeek.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <button
              onClick={handleNextWeek}
              className="flex h-8 w-8 items-center justify-center rounded-r-lg text-muted transition hover:bg-muted/10 hover:text-text"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      }
    >
      <div className="mt-4">
        {isLoading && <p className="text-sm text-muted">Loading attendance history...</p>}
        {isError && <p className="text-sm text-red-600">Failed to load attendance history.</p>}
        {!isLoading && !isError && (!attendance || attendance.length === 0) && (
          <p className="text-sm text-muted">No service attendance found for this week.</p>
        )}
        {!isLoading && !isError && attendance && attendance.length > 0 && (
          <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell>Service Date</ListTableHeaderCell>
                  <ListTableHeaderCell>Time Slot</ListTableHeaderCell>
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
                    <ListTableCell>{formatDateTime(record.checked_in_at)}</ListTableCell>
                    <ListTableCell>
                      <div className="flex gap-1 flex-wrap">
                        {record.is_walk_in && (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            Walk-in
                          </span>
                        )}
                        {record.is_override && (
                          <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-700/10">
                            Override
                          </span>
                        )}
                        {record.is_manual_entry && (
                          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-700/10">
                            Manual
                          </span>
                        )}
                        {!record.is_walk_in && !record.is_override && !record.is_manual_entry && (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            Regular
                          </span>
                        )}
                      </div>
                    </ListTableCell>
                  </ListTableRow>
                ))}
              </ListTableBody>
            </ListTable>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
