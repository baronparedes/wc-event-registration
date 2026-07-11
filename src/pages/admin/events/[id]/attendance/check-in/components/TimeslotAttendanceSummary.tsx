import { Clock3, Users } from 'lucide-react';

import { EmptyState } from '@/components/ui';
import type { AttendanceSlotSummary } from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';

type TimeslotAttendanceSummaryProps = {
  summaries: AttendanceSlotSummary[];
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
};

export function TimeslotAttendanceSummary(props: TimeslotAttendanceSummaryProps) {
  const { summaries, isLoading, isError, errorMessage } = props;

  if (isLoading) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-text">Timeslot Attendance</h2>
        <p className="mt-2 text-sm text-muted">Loading slot attendance summary...</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-red-800">Timeslot Attendance</h2>
        <p className="mt-1 text-sm text-red-700">
          {errorMessage ?? 'Failed to load slot attendance summary.'}
        </p>
      </section>
    );
  }

  if (summaries.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold text-text">Timeslot Attendance</h2>
        <div className="mt-4 rounded-2xl border border-border bg-background px-4 py-8">
          <EmptyState
            icon={<Clock3 className="h-6 w-6" />}
            title="No slot records yet"
            description="Check in attendees with a selected timeslot to populate slot-level summaries."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-text">Timeslot Attendance</h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
          <Users className="h-3.5 w-3.5" />
          {summaries.reduce((total, summary) => total + summary.count, 0)} slot records
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {summaries.map((summary) => (
          <article key={summary.slot} className="rounded-xl border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-text">
                {formatDateTime(summary.slot, summary.slot)}
              </h3>
              <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted">
                {summary.count} attendee{summary.count === 1 ? '' : 's'}
              </span>
            </div>

            <ul className="mt-3 space-y-2">
              {summary.attendees.map((attendee) => (
                <li
                  key={`${attendee.check_in_id}-${attendee.recorded_at}`}
                  className="rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <p className="text-sm font-medium text-text">{attendee.full_name}</p>
                  <p className="text-xs text-muted">
                    {attendee.member_id
                      ? `Member ID: ${attendee.member_id}`
                      : (attendee.email ?? 'Guest')}
                  </p>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
