import { MapPin } from 'lucide-react';

import type { ServiceAttendance } from '@/lib/domain/services';
import { formatDateTime } from '@/lib/infrastructure';

import { ServiceAttendanceStatusBadge } from './ServiceAttendanceStatusBadge';
import { formatAssignedSeat } from './utils';

interface NonSundayAttendanceListProps {
  records: ServiceAttendance[];
}

export function NonSundayAttendanceList({ records }: NonSundayAttendanceListProps) {
  if (records.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface p-4 shadow-xs">
      <div className="flex items-center gap-2 font-semibold text-sm text-text">
        <MapPin className="h-4 w-4 text-primary" />
        <span>Other Services Attended</span>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {records.map((record) => (
          <div
            key={record.id}
            className="flex flex-col gap-1 rounded-lg border border-border bg-surface/50 p-2.5 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text">
                {record.service_date} • {record.time_slot}
              </span>
              <ServiceAttendanceStatusBadge record={record} />
            </div>
            <div className="text-muted">Assignment: {formatAssignedSeat(record.service_seats)}</div>
            <div className="text-[11px] text-muted">{formatDateTime(record.checked_in_at)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
