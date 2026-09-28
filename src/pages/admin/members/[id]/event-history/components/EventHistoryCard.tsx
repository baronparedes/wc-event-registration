import { CalendarDays, ChevronRight, MapPin } from 'lucide-react';

import type { MemberEventHistoryItem } from '@/lib/domain/members';

import type { FormatDateTime } from './EventRegistrationsModal';

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

export function EventHistoryRow({ group, formatDateTime, onView }: Props) {
  const checkedInCount = group.registrations.filter(
    (r) => r.check_in_status === 'checked_in',
  ).length;
  const attendanceEnabled = group.registrations.some((r) => r.attendance_enabled);
  const activeCount = group.registrations.filter(
    (r) => r.registration_status !== 'cancelled',
  ).length;

  return (
    <button
      type="button"
      onClick={onView}
      aria-label={`View ${group.event_title} details`}
      className="flex w-full items-center justify-between gap-3 bg-surface px-4 py-3 text-left transition-colors hover:bg-background/70 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-text">{group.event_title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          {group.starts_at && (
            <span className="flex min-w-0 items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span className="break-words">
                {formatDateTime(group.starts_at)}
                {group.ends_at && <> - {formatDateTime(group.ends_at)}</>}
              </span>
            </span>
          )}
          {group.location && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="break-words">{group.location}</span>
            </span>
          )}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {attendanceEnabled && (
          <span
            className={`hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${
              checkedInCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-muted/20 text-muted'
            }`}
          >
            {checkedInCount > 0 ? 'Attended' : 'Not Attended'}
          </span>
        )}
        <span className="whitespace-nowrap text-xs text-muted">
          {activeCount} registration{activeCount !== 1 ? 's' : ''}
        </span>
        <ChevronRight className="h-4 w-4 text-muted" aria-hidden="true" />
      </span>
    </button>
  );
}
