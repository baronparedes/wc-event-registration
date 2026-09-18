import { AlertCircle, CalendarDays, CheckCircle2, Clock } from 'lucide-react';

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
      <div className="flex h-full min-h-[92px] flex-col justify-between gap-1 rounded-xl border-2 border-danger bg-surface p-2.5 text-left shadow-xs">
        <div className="flex items-center gap-1 text-xs font-bold text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-danger" />
          <span>Missed Committed</span>
        </div>
        <p className="text-[11px] text-muted font-medium">Scheduled commitment not attended</p>
      </div>
    );
  }

  if (status === 'upcoming_committed') {
    return (
      <div className="flex h-full min-h-[92px] flex-col justify-between gap-1 rounded-xl border-2 border-dashed border-primary bg-surface p-2.5 text-left shadow-xs">
        <div className="flex items-center gap-1 text-xs font-bold text-primary">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>Upcoming Committed</span>
        </div>
        <p className="text-[11px] text-muted font-medium">Committed Sunday slot</p>
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
