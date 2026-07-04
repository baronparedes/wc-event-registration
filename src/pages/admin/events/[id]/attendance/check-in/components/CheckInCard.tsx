import { Button, SectionCard } from '@/components/ui';
import { useFieldAnswerTextFormatter } from '@/hooks/utils';
import type { AttendeeSearchResult, CheckInResult } from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';

type CheckInCardProps = {
  attendee: AttendeeSearchResult | null;
  checkInResult: CheckInResult | null;
  isSubmitting: boolean;
  inactivitySecondsRemaining: number | null;
  onCheckIn: () => void;
  onReadyForNext: () => void;
};

function getAnswerCardsItemClass(cardCount: number): string {
  if (cardCount <= 1) {
    return 'w-full';
  }

  if (cardCount === 2) {
    return 'w-full md:w-[calc(50%-0.375rem)]';
  }

  return 'w-full md:w-[calc(50%-0.375rem)] xl:w-[calc(33.333%-0.5rem)]';
}

export function CheckInCard(props: CheckInCardProps) {
  const {
    attendee,
    checkInResult,
    isSubmitting,
    inactivitySecondsRemaining,
    onCheckIn,
    onReadyForNext,
  } = props;
  const { getAnswerText } = useFieldAnswerTextFormatter();

  const shouldShowReadyForNext =
    Boolean(checkInResult) || attendee?.check_in_status === 'checked_in';

  return (
    <SectionCard
      title="Step 3: Confirm Check-In"
      titleClassName="font-heading text-2xl font-semibold text-text"
      subtitle="Review attendee details, then confirm the official check-in timestamp."
      subtitleClassName="mt-2 text-lg text-muted"
    >
      {!attendee && (
        <p className="text-base text-muted">Select an attendee from search results to continue.</p>
      )}
      {attendee && (
        <div className="space-y-4">
          <div
            className={`rounded-xl border px-4 py-3 text-base font-semibold shadow-sm ${
              attendee.check_in_status === 'checked_in'
                ? 'border-green-300 bg-green-100 text-green-900'
                : 'border-primary/40 bg-blue-100 text-primary'
            }`}
          >
            {attendee.check_in_status === 'checked_in'
              ? 'Already Checked In'
              : 'Ready for Check-In'}
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-background p-4">
            <h3 className="text-2xl font-semibold text-text">{attendee.full_name}</h3>
            <p className="text-base text-muted">Member ID: {attendee.member_id ?? 'Guest'}</p>
            <p className="text-base text-muted">Role: {attendee.role ?? 'N/A'}</p>
            <p className="text-base text-muted">Category: {attendee.category ?? 'N/A'}</p>
            <p className="text-base text-muted">
              Registered: {formatDateTime(attendee.submitted_at)}
            </p>
            {attendee.official_check_in_time && (
              <p className="text-base text-muted">
                Official check-in time: {formatDateTime(attendee.official_check_in_time)}
              </p>
            )}
          </div>

          <div className="rounded-xl border-2 border-secondary/30 bg-teal-50/70 p-5 shadow-sm">
            <p className="text-2xl font-semibold text-text">Registration answers</p>
            {attendee.registration_answers.length === 0 ? (
              <p className="mt-3 text-lg text-muted">No registration answers available.</p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-3">
                {attendee.registration_answers.map((answer) => {
                  const answerText = getAnswerText(answer.field_type, answer);

                  return (
                    <li
                      key={answer.event_field_id}
                      className={`${getAnswerCardsItemClass(attendee.registration_answers.length)} rounded-xl border border-secondary/20 bg-surface p-4 shadow-xs`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {answer.label}
                      </p>
                      <p className="mt-2 break-words text-xl font-semibold text-text">
                        {answerText}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-xl border-2 border-primary/30 bg-blue-50/70 p-5 shadow-sm">
            <p className="text-2xl font-semibold text-text">Attendance details</p>
            {attendee.attendance_answers.length === 0 ? (
              <p className="mt-3 text-lg text-muted">No pre-event attendance details saved yet.</p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-3">
                {attendee.attendance_answers.map((answer) => {
                  const answerText = getAnswerText(answer.field_type, answer);

                  return (
                    <li
                      key={answer.attendance_field_id}
                      className={`${getAnswerCardsItemClass(attendee.attendance_answers.length)} rounded-xl border border-primary/20 bg-surface p-4 shadow-xs`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {answer.label}
                      </p>
                      <p className="mt-2 break-words text-xl font-semibold text-text">
                        {answerText}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {checkInResult && (
            <div
              className={`rounded-xl border px-4 py-3 text-base ${
                checkInResult.status === 'checked_in'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : checkInResult.status === 'already_checked_in'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <p className="font-medium">{checkInResult.message}</p>
              {checkInResult.official_check_in_time && (
                <p className="mt-1 text-base">
                  Official time: {formatDateTime(checkInResult.official_check_in_time)}
                </p>
              )}
            </div>
          )}

          <div className="sticky bottom-2 space-y-2 rounded-xl bg-surface/95 p-2 backdrop-blur sm:static sm:bg-transparent sm:p-0">
            {shouldShowReadyForNext ? (
              <Button type="button" fullWidth={true} size="lg" onClick={onReadyForNext}>
                Ready for Next Attendee
              </Button>
            ) : (
              <Button
                type="button"
                fullWidth={true}
                size="lg"
                onClick={onCheckIn}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Checking In...' : 'Confirm Check-In'}
              </Button>
            )}
            {inactivitySecondsRemaining !== null && (
              <p className="text-center text-base text-muted">
                Returning to Step 1 in {inactivitySecondsRemaining}s due to inactivity.
              </p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}
