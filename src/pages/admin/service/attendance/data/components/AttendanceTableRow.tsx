import { format } from 'date-fns';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { ListTableCell, ListTableRow } from '@/components/ui/ListTable';
import { type ServiceAttendance } from '@/lib/domain/services';

export interface AttendanceTableRowProps {
  memberKey: string;
  records: ServiceAttendance[];
}

export function AttendanceTableRow({ memberKey, records }: AttendanceTableRowProps) {
  const first = records[0]!;
  const isMulti = records.length > 1;

  return (
    <ListTableRow key={memberKey}>
      {/* Name — shown once, vertically centered */}
      <ListTableCell>
        <div className="flex items-center gap-3">
          <Avatar
            name={first.user?.full_name || first.user?.nickname || 'Volunteer'}
            avatarObjectKey={first.user?.avatar_object_key}
            size="sm"
            className="shrink-0"
          />
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-text">{first.user?.full_name || '—'}</span>
            {first.user?.nickname && (
              <span className="text-xs text-muted">{first.user.nickname}</span>
            )}
          </div>
        </div>
      </ListTableCell>

      {/* RFID — shown once */}
      <ListTableCell className="font-mono text-xs">{first.rfid ?? '—'}</ListTableCell>

      {/* Role — from first record's metadata */}
      <ListTableCell>{first.metadata?.role as string}</ListTableCell>

      {/* Date — same for all records in group */}
      <ListTableCell>{first.service_date}</ListTableCell>

      {/* Time Slot — stacked */}
      <ListTableCell>
        <div className={isMulti ? 'divide-y divide-border/60' : undefined}>
          {records.map((r) => (
            <div key={r.id} className="py-1.5 first:pt-0 last:pb-0">
              {r.time_slot}
            </div>
          ))}
        </div>
      </ListTableCell>

      {/* Status — stacked */}
      <ListTableCell>
        <div className={isMulti ? 'divide-y divide-border/60' : undefined}>
          {records.map((r) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-1.5 py-1.5 first:pt-0 last:pb-0"
            >
              {r.is_walk_in && <Badge variant="secondary">Walk-in</Badge>}
              {r.is_override && <Badge variant="accent">Late Check-In</Badge>}
              {!r.is_walk_in && !r.is_override && <span className="text-xs text-muted">—</span>}
            </div>
          ))}
        </div>
      </ListTableCell>

      {/* Checked In — stacked */}
      <ListTableCell>
        <div className={isMulti ? 'divide-y divide-border/60' : undefined}>
          {records.map((r) => (
            <div key={r.id} className="py-1.5 first:pt-0 last:pb-0">
              {r.checked_in_at ? format(new Date(r.checked_in_at), 'p') : '—'}
            </div>
          ))}
        </div>
      </ListTableCell>

      {/* Table — stacked */}
      <ListTableCell>
        <div className={isMulti ? 'divide-y divide-border/60' : undefined}>
          {records.map((r) => (
            <div key={r.id} className="py-1.5 first:pt-0 last:pb-0">
              {r.service_seats ? `${r.service_seats.table_number || ''}` : '—'}
            </div>
          ))}
        </div>
      </ListTableCell>
    </ListTableRow>
  );
}
