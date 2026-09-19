import { AlertCircle, CalendarDays, CheckCircle2, Clock, Info } from 'lucide-react';

import { Badge, Skeleton } from '@/components/ui';
import type { MatrixCellData } from '@/lib/domain/services';
import { formatDateTime } from '@/lib/infrastructure';

import { ServiceAttendanceStatusBadge } from './ServiceAttendanceStatusBadge';
import { formatAssignedSeat } from './utils';

interface ServiceMatrixCellProps {
  cell: MatrixCellData;
}

export function ServiceMatrixCell({ cell }: ServiceMatrixCellProps) {
  const { status, attendance: record } = cell;

  if (status === 'loading') {
    return (
      <div
        data-testid="service-matrix-cell-loading"
        className="flex h-[104px] w-full flex-col justify-between gap-1.5 rounded-xl border border-border/70 bg-surface p-2.5 text-left shadow-xs"
      >
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-3.5 w-28 rounded" />
        <Skeleton className="h-3 w-20 rounded" />
      </div>
    );
  }

  if (status === 'attended_committed' && record) {
    return (
      <div className="flex h-[104px] w-full flex-col justify-between gap-1.5 rounded-xl border-2 border-primary bg-surface p-2.5 text-left shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <Badge
            variant="default"
            icon={<CheckCircle2 className="h-3 w-3 shrink-0" />}
            className="px-2 py-0.5 text-[11px]"
          >
            Committed
          </Badge>
          <ServiceAttendanceStatusBadge record={record} />
        </div>
        <div
          className="text-xs font-medium text-text truncate"
          title={formatAssignedSeat(record.service_seats)}
        >
          <span className="text-muted mr-1">Assignment:</span>
          <span className="font-semibold text-text">
            {formatAssignedSeat(record.service_seats)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{formatDateTime(record.checked_in_at)}</span>
        </div>
      </div>
    );
  }

  if (status === 'attended_unscheduled' && record) {
    return (
      <div className="flex h-[104px] w-full flex-col justify-between gap-1.5 rounded-xl border-2 border-secondary bg-surface p-2.5 text-left shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <Badge
            variant="secondary"
            icon={<CheckCircle2 className="h-3 w-3 shrink-0" />}
            className="px-2 py-0.5 text-[11px]"
          >
            Unscheduled
          </Badge>
          <ServiceAttendanceStatusBadge record={record} />
        </div>
        <div
          className="text-xs font-medium text-text truncate"
          title={formatAssignedSeat(record.service_seats)}
        >
          <span className="text-muted mr-1">Assignment:</span>
          <span className="font-semibold text-text">
            {formatAssignedSeat(record.service_seats)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-muted">
          <Clock className="h-3 w-3 shrink-0" />
          <span>{formatDateTime(record.checked_in_at)}</span>
        </div>
      </div>
    );
  }

  if (status === 'missed_committed') {
    return (
      <div className="flex h-[104px] w-full flex-col justify-between gap-1.5 rounded-xl border-2 border-danger bg-surface p-2.5 text-left shadow-xs">
        <div>
          <Badge
            variant="destructive"
            icon={<AlertCircle className="h-3 w-3 shrink-0" />}
            className="px-2 py-0.5 text-[11px]"
          >
            No Check-In (Committed)
          </Badge>
        </div>
        <p className="text-[11px] text-muted font-medium">Scheduled slot, no check-in recorded</p>
      </div>
    );
  }

  if (status === 'upcoming_committed') {
    return (
      <div className="flex h-[104px] w-full flex-col justify-between gap-1.5 rounded-xl border-2 border-dashed border-primary bg-surface p-2.5 text-left shadow-xs">
        <div>
          <Badge
            variant="outline"
            icon={<CalendarDays className="h-3 w-3 shrink-0 text-primary" />}
            className="border-dashed border-primary px-2 py-0.5 text-[11px] text-primary"
          >
            Upcoming Committed
          </Badge>
        </div>
        <p className="text-[11px] text-muted font-medium">Committed Sunday slot</p>
      </div>
    );
  }

  if (status === 'excused') {
    return (
      <div className="flex h-[104px] w-full flex-col justify-between gap-1.5 rounded-xl border-2 border-accent bg-surface p-2.5 text-left shadow-xs">
        <div>
          <Badge
            variant="accent"
            icon={<Info className="h-3 w-3 shrink-0 text-amber-800" />}
            className="border border-accent/40 bg-accent/20 px-2 py-0.5 text-[11px] text-amber-900"
          >
            Excused
          </Badge>
        </div>
        <p
          className="text-[11px] text-muted font-medium line-clamp-2"
          title={cell.excusedReason || undefined}
        >
          {cell.excusedReason ? cell.excusedReason : 'Excused from schedule'}
        </p>
      </div>
    );
  }

  if (status === 'not_applicable') {
    return (
      <div className="flex h-[104px] w-full items-center justify-center rounded-xl border border-border/40 bg-surface/50 p-2 text-center text-xs text-muted/40">
        —
      </div>
    );
  }

  return (
    <div className="flex h-[104px] w-full items-center justify-center rounded-xl border border-dashed border-border bg-surface p-2 text-center text-xs text-muted/60">
      Off Schedule
    </div>
  );
}
