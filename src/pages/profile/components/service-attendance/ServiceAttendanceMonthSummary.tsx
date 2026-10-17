import { CalendarDays, FileText } from 'lucide-react';

import { Badge, Button } from '@/components/ui';

interface ServiceAttendanceMonthSummaryProps {
  attendanceCount: number;
  fullMonthName: string;
  missedCount: number;
  isFetching: boolean;
  excuseCount?: number;
  onViewExcuses?: () => void;
}

export function ServiceAttendanceMonthSummary({
  attendanceCount,
  fullMonthName,
  missedCount,
  isFetching,
  excuseCount,
  onViewExcuses,
}: ServiceAttendanceMonthSummaryProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-5 w-5 text-primary" />
        <span className="text-base font-medium text-text">
          {`${attendanceCount} service${attendanceCount === 1 ? '' : 's'} attended in ${fullMonthName}`}
        </span>
        {isFetching && (
          <span className="text-sm text-muted animate-pulse font-normal">(updating...)</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {onViewExcuses && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onViewExcuses}
            className="h-8 gap-1.5 text-xs font-semibold"
          >
            <FileText className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
            Filed Excuses {excuseCount !== undefined && excuseCount > 0 ? `(${excuseCount})` : ''}
          </Button>
        )}
        {missedCount > 0 && <Badge variant="destructive">{missedCount} No-Check In</Badge>}
      </div>
    </div>
  );
}
