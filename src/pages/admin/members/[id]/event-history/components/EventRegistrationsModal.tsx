import { CalendarDays, MapPin } from 'lucide-react';

import { Dialog } from '@/components/ui/Dialog';
import type { MemberEventHistoryItem } from '@/lib/domain/members';

import type { MemberEventGroup } from './EventHistoryCard';

export type FormatDateTime = (value: string | null, fallback?: string) => string;

export function RegistrationDetail({
  item,
  formatDateTime,
}: {
  item: MemberEventHistoryItem;
  formatDateTime: FormatDateTime;
}) {
  const isCheckedIn = item.check_in_status === 'checked_in';
  const hasRegistrationAnswers = item.registration_answers.length > 0;
  const hasAnswers = item.attendance_enabled && item.attendance_answers.length > 0;
  const hasSlots = item.slot_records.length > 0;

  if (!isCheckedIn && !hasRegistrationAnswers && !hasSlots && !hasAnswers) return null;

  return (
    <div className="border-t border-primary/20 bg-primary/5 px-2.5 py-2 text-xs sm:px-3 sm:py-2.5 sm:text-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {item.attendance_enabled && isCheckedIn && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
            Checked In
          </span>
        )}

        {isCheckedIn && item.official_check_in_time && (
          <span className="text-xs text-muted">
            at {formatDateTime(item.official_check_in_time)}
          </span>
        )}
      </div>

      {hasRegistrationAnswers && (
        <div className="mt-1">
          <p className="mb-0.5 text-xs font-medium text-primary">Registration data:</p>
          <dl className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {item.registration_answers.map((ans) => (
              <div key={ans.event_field_id} className="min-w-0">
                <dt className="text-xs text-muted">{ans.label}</dt>
                <dd className="break-words font-medium text-text">
                  {ans.answer_text ??
                    (ans.answer_number !== null ? String(ans.answer_number) : '—')}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {hasSlots && (
        <div className="mt-1">
          <p className="mb-0.5 text-xs font-medium text-secondary">Timeslots:</p>
          <ul className="ml-2 space-y-0">
            {item.slot_records.map((sr, i) => (
              <li key={i} className="text-text">
                {sr.slot}
                <span className="ml-2 text-xs text-muted">{formatDateTime(sr.recorded_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasAnswers && (
        <div className="mt-1">
          <p className="mb-0.5 text-xs font-medium text-primary">Attendance data:</p>
          <dl className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
            {item.attendance_answers.map((ans) => (
              <div key={ans.attendance_field_id} className="min-w-0">
                <dt className="text-xs text-muted">{ans.label}</dt>
                <dd className="break-words font-medium text-text">
                  {ans.answer_text ??
                    (ans.answer_number !== null ? String(ans.answer_number) : '—')}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

type Props = {
  group: MemberEventGroup | null;
  isOpen: boolean;
  onClose: () => void;
  formatDateTime: FormatDateTime;
};

export function EventRegistrationsModal({ group, isOpen, onClose, formatDateTime }: Props) {
  if (!group) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      title={group.event_title}
      showCloseIcon
      showCloseButton
    >
      <div className="mt-0.5 space-y-1.5 text-sm text-muted">
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

      <div className="mt-2.5 space-y-1.5">
        {[...group.registrations]
          .sort((a, b) => {
            if (!a.submitted_at && !b.submitted_at) return 0;
            if (!a.submitted_at) return 1;
            if (!b.submitted_at) return -1;
            return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
          })
          .map((item) => (
            <RegistrationDetail
              key={item.registration_id}
              item={item}
              formatDateTime={formatDateTime}
            />
          ))}
      </div>
    </Dialog>
  );
}
