import { AlertCircle, CalendarDays, CheckCircle2, Clock, Info } from 'lucide-react';

import { Badge } from '@/components/ui';
import type { MatrixCellData } from '@/lib/domain/services';
import { formatDateTime } from '@/lib/infrastructure';

import { ServiceAttendanceStatusBadge } from './ServiceAttendanceStatusBadge';
import { formatAssignedSeat } from './utils';

interface ServiceMatrixCellProps {
  cell: MatrixCellData;
}

export function ServiceMatrixCell({ cell }: ServiceMatrixCellProps) {
  const { status, attendance: record } = cell;

  if (status === 'attended_committed' && record) {
    return (
      <div className="flex h-full min-h-[92px] flex-col justify-between gap-1.5 rounded-xl border-2 border-primary bg-surface p-2.5 text-left shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <Badge
            variant="success"
            icon={<CheckCircle2 className="h-3 w-3 shrink-0" />}
            className="px-2 py-0.5 text-[11px]"
          >
            Committed
          </Badge>
          <ServiceAttendanceStatusBadge record={record} />
        </div>
        <div className="text-xs font-medium text-text">
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
      <div className="flex h-full min-h-[92px] flex-col justify-between gap-1.5 rounded-xl border-2 border-secondary bg-surface p-2.5 text-left shadow-xs transition-shadow hover:shadow-sm">
        <div className="flex items-center justify-between gap-1.5 flex-wrap">
          <Badge
            variant="warning"
            icon={<CheckCircle2 className="h-3 w-3 shrink-0" />}
            className="px-2 py-0.5 text-[11px]"
          >
            Unscheduled
          </Badge>
          <ServiceAttendanceStatusBadge record={record} />
        </div>
        <div className="text-xs font-medium text-text">
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
      <div className="flex h-full min-h-[92px] flex-col justify-between gap-1.5 rounded-xl border-2 border-danger bg-surface p-2.5 text-left shadow-xs">
        <div>
          <Badge
            variant="danger"
            icon={<AlertCircle className="h-3 w-3 shrink-0" />}
            className="px-2 py-0.5 text-[11px]"
          >
            Missed Committed
          </Badge>
        </div>
        <p className="text-[11px] text-muted font-medium">Scheduled commitment not attended</p>
      </div>
    );
  }

  if (status === 'upcoming_committed') {
    return (
      <div className="flex h-full min-h-[92px] flex-col justify-between gap-1.5 rounded-xl border-2 border-dashed border-primary bg-surface p-2.5 text-left shadow-xs">
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
      <div className="flex h-full min-h-[92px] flex-col justify-between gap-1.5 rounded-xl border-2 border-accent bg-surface p-2.5 text-left shadow-xs">
        <div>
          <Badge
            variant="accent"
            icon={<Info className="h-3 w-3 shrink-0 text-amber-800" />}
            className="border border-accent/40 bg-accent/20 px-2 py-0.5 text-[11px] text-amber-900"
          >
            Excused
          </Badge>
        </div>
        <p className="text-[11px] text-muted font-medium">
          {cell.excusedReason ? cell.excusedReason : 'Excused from schedule'}
        </p>
      </div>
    );
  }

  if (status === 'not_applicable') {
    return (
      <div className="flex h-full min-h-[92px] items-center justify-center rounded-xl border border-border/40 bg-surface/50 p-2 text-center text-xs text-muted/40">
        —
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[92px] items-center justify-center rounded-xl border border-dashed border-border bg-surface p-2 text-center text-xs text-muted/60">
      Off Schedule
    </div>
  );
}
