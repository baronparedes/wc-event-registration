import { format } from 'date-fns';

import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import {
  MobileCard,
  MobileCardBody,
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

  const role = first.user?.role || (first.metadata?.role as string) || '';
  const category = first.user?.category || '';
  const roleCategory = [role, category].filter(Boolean).join(' • ');
  const isActive = first.user?.is_active ?? true;

  const trimmedName = `${first.user?.nickname ?? ''} ${first.user?.full_name ?? ''}`.trim();
  const avatarName = trimmedName !== '' ? trimmedName : first.user?.full_name || 'Volunteer';

  return (
    <MobileCard className="mb-4">
      <MobileCardBody>
        <MobileCardHeader>
          <div className="flex min-w-0 items-center gap-3">
            <Avatar
              name={avatarName}
              avatarObjectKey={first.user?.avatar_object_key}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-semibold leading-snug text-[#0f172a]">
                {first.user?.full_name || '—'}
              </h2>
              {first.user?.nickname && (
                <p className="truncate text-sm text-slate-500">({first.user.nickname})</p>
              )}
              {roleCategory && (
                <div className="flex flex-wrap gap-2 pt-1 pb-1 text-xs text-muted">
                  <p>{roleCategory}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant={isActive ? 'default' : 'destructive'}
              className={`px-3 py-1 rounded-full ${isActive ? 'bg-primary text-white' : ''}`}
            >
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </MobileCardHeader>

        <MobileCardDivider className="my-2" />

        {/* Three Grid Cards for the time slots */}
        <div className="grid grid-cols-3 gap-2">
          {['9AM', '12NN', '3PM'].map((slot) => {
            const record = recordsBySlot[slot];

            if (!record) {
              return (
                <div
                  key={`${memberKey}-${slot}`}
                  className="flex flex-col items-center justify-center rounded-lg border border-border bg-slate-50 p-2.5 text-center opacity-60 min-h-[110px]"
                >
                  <p className="font-bold text-sm text-slate-500 mb-1">{slot}</p>
                  <div>
                    <span className="text-xs text-slate-400 italic">No record</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={`${record.id}-${slot}`}
                className="flex flex-col justify-between rounded-lg border border-border bg-white p-2.5 shadow-xs min-h-[110px]"
              >
                <div className="border-b border-border/40 pb-1.5 mb-1.5 min-w-0">
                  <span className="font-bold text-sm text-text block">{slot}</span>
                  {(record.is_walk_in || record.is_override) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {record.is_walk_in && (
                        <Badge
                          variant="secondary"
                          className="px-1.5 py-0.5 text-[10px] leading-none"
                        >
                          Walk-in
                        </Badge>
                      )}
                      {record.is_override && (
                        <Badge variant="accent" className="px-1.5 py-0.5 text-[10px] leading-none">
                          Late
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 pt-0.5">
                  <div>
                    <span className="text-[11px] text-muted block leading-tight">Checked In</span>
                    <span className="text-sm font-semibold text-text block leading-snug">
                      {record.checked_in_at ? format(new Date(record.checked_in_at), 'p') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted block leading-tight">Table</span>
                    <span className="text-sm font-semibold text-text block leading-snug">
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
