import { CalendarDays } from 'lucide-react';

import { Badge } from '@/components/ui';

interface ServiceAttendanceMonthSummaryProps {
  attendanceCount: number;
  fullMonthName: string;
  missedCount: number;
  isFetching: boolean;
}

export function ServiceAttendanceMonthSummary({
  attendanceCount,
  fullMonthName,
  missedCount,
  isFetching,
}: ServiceAttendanceMonthSummaryProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium text-text">
          {`${attendanceCount} service${attendanceCount === 1 ? '' : 's'} attended in ${fullMonthName}`}
        </span>
        {isFetching && (
          <span className="text-xs text-muted animate-pulse font-normal">(updating...)</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">{attendanceCount} Total</Badge>
        {missedCount > 0 && <Badge variant="destructive">{missedCount} No-Check In</Badge>}
      </div>
    </div>
  );
}
