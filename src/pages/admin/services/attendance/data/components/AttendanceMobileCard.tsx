import { format } from 'date-fns';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  MobileCard,
  MobileCardBody,
  MobileCardContent,
  MobileCardContentItem,
  MobileCardDivider,
  MobileCardHeader,
} from '@/components/ui/MobileCard';
import { type ServiceAttendance } from '@/lib/domain/services';

export interface AttendanceMobileCardProps {
  memberKey: string;
  records: ServiceAttendance[];
}

export function AttendanceMobileCard({ memberKey, records }: AttendanceMobileCardProps) {
  const first = records[0]!;

  // Create a map to look up records by time slot easily
  const recordsBySlot = records.reduce(
    (acc, record) => {
      if (record.time_slot) {
        acc[record.time_slot] = record;
      }
      return acc;
    },
    {} as Record<string, ServiceAttendance>,
  );

  // Check if there are any records to render
  if (records.length === 0) return null;

  return (
    <MobileCard className="mb-4">
      <MobileCardBody>
        <MobileCardHeader>
          <div className="flex items-center gap-3 min-w-0">
            <Avatar
              name={first.user?.full_name || first.user?.nickname || 'Volunteer'}
              avatarObjectKey={first.user?.avatar_object_key}
              size="lg"
              className="shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-text truncate">
                {first.user?.full_name || '—'}
              </span>
              {first.user?.nickname && (
                <span className="text-sm text-muted truncate">{first.user.nickname}</span>
              )}
            </div>
          </div>
        </MobileCardHeader>

        <MobileCardContent className="mt-2">
          <MobileCardContentItem label="RFID" value={first.rfid ?? '—'} isMono={true} />
          <MobileCardContentItem label="Role" value={first.metadata?.role as string} />
        </MobileCardContent>

        <MobileCardDivider className="my-2" />

        {/* Three Grid Cards for the time slots */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {['9AM', '12NN', '3PM'].map((slot) => {
            const record = recordsBySlot[slot];

            if (!record) {
              return (
                <div
                  key={`${memberKey}-${slot}`}
                  className="rounded-lg border border-border bg-slate-50 p-3 opacity-60"
                >
                  <p className="font-medium text-sm text-center text-slate-500 mb-2">{slot}</p>
                  <div className="text-center">
                    <span className="text-xs text-slate-400 italic">No record</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${record.id}-${slot}`}
                className="rounded-lg border border-border bg-white p-3 shadow-xs"
              >
                <div className="flex justify-between items-center mb-2 border-b border-border/40 pb-2">
                  <span className="font-medium text-sm">{slot}</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {record.is_walk_in && (
                      <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                        Walk-in
                      </Badge>
                    )}
                    {record.is_override && (
                      <Badge variant="accent" className="px-1.5 py-0 text-[10px]">
                        Late
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted">Checked In</span>
                    <span className="text-xs font-medium">
                      {record.checked_in_at ? format(new Date(record.checked_in_at), 'p') : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted">Table</span>
                    <span className="text-xs font-medium">
                      {record.service_seats ? `${record.service_seats.table_number || ''}` : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </MobileCardBody>
    </MobileCard>
  );
}
