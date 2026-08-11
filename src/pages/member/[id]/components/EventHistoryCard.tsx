import { CalendarDays, MapPin } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import type { MemberEventHistoryItem } from '@/lib/domain/members';

import { type FormatDateTime, RegistrationDetail } from './EventRegistrationsModal';

export type MemberEventGroup = {
  event_id: string;
  event_title: string;
  event_slug: string;
  starts_at: string | null;
  ends_at: string | null;
  location: string | null;
  registrations: MemberEventHistoryItem[];
};

type Props = {
  group: MemberEventGroup;
  formatDateTime: FormatDateTime;
  onView: () => void;
};

type SingleProps = {
  group: MemberEventGroup;
  formatDateTime: FormatDateTime;
};

export function EventSingleCard({ group, formatDateTime }: SingleProps) {
  const [item] = group.registrations;
  const isCheckedIn = item.check_in_status === 'checked_in';

  return (
    <div className="rounded-xl border border-primary/20 bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h3 className="text-base font-semibold text-text">{group.event_title}</h3>
          <div className="space-y-1.5 text-sm text-muted">
            {group.starts_at && (
              <span className="flex min-w-0 items-start gap-1.5">
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-words">
                  {formatDateTime(group.starts_at)}
                  {group.ends_at && <> - {formatDateTime(group.ends_at)}</>}
                </span>
              </span>
            )}
            {group.location && (
              <span className="flex min-w-0 items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{group.location}</span>
              </span>
            )}
          </div>
        </div>
        {item.attendance_enabled && isCheckedIn && (
          <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            Checked In
          </span>
        )}
      </div>
      <div className="mt-3">
        <RegistrationDetail item={item} formatDateTime={formatDateTime} />
      </div>
    </div>
  );
}

export function EventGroupCard({ group, formatDateTime, onView }: Props) {
  const checkedInCount = group.registrations.filter(
    (r) => r.check_in_status === 'checked_in',
  ).length;
  const attendanceEnabled = group.registrations.some((r) => r.attendance_enabled);
  const activeCount = group.registrations.filter(
    (r) => r.registration_status !== 'cancelled',
  ).length;

  return (
    <div className="rounded-xl border border-primary/20 bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <h3 className="text-base font-semibold text-text">{group.event_title}</h3>
          <div className="space-y-1.5 text-sm text-muted">
            {group.starts_at && (
              <span className="flex min-w-0 items-start gap-1.5">
                <CalendarDays className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-words">
                  {formatDateTime(group.starts_at)}
                  {group.ends_at && <> - {formatDateTime(group.ends_at)}</>}
                </span>
              </span>
            )}
            {group.location && (
              <span className="flex min-w-0 items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{group.location}</span>
              </span>
            )}
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 border-t border-primary/20 pt-3 sm:w-auto sm:border-0 sm:pt-0">
          <div className="flex flex-wrap items-center gap-2">
            {attendanceEnabled && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  checkedInCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-muted/20 text-muted'
                }`}
              >
                {checkedInCount > 0 ? 'Attended' : 'Not Attended'}
              </span>
            )}
            <span className="inline-flex items-center rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-medium text-secondary">
              {activeCount} registration{activeCount !== 1 ? 's' : ''}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={onView} className="w-full sm:w-auto">
            View
          </Button>
        </div>
      </div>
    </div>
  );
}
