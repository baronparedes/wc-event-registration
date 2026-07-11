import { Button } from '@/components/ui';
import { WizardStep } from '@/components/ui/WizardStep';
import { useFieldAnswerTextFormatter } from '@/hooks/utils';
import type { AttendeeSearchResult, CheckInResult } from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';

function getAnswerCardsItemClass(cardCount: number): string {
  if (cardCount <= 1) {
    return 'w-full';
  }

  if (cardCount === 2) {
    return 'w-full md:w-[calc(50%-0.375rem)]';
  }

  return 'w-full md:w-[calc(50%-0.375rem)] xl:w-[calc(33.333%-0.5rem)]';
}

type AttendeeConfirmStepProps = {
  attendee: AttendeeSearchResult | null;
  checkInResult: CheckInResult | null;
  isSubmitting: boolean;
  timeslotEnabled: boolean;
  timeslots: string[];
  suggestedSlot: string;
  onTimeslotConfirm: (slot: string) => void;
  onCheckIn: () => void;
  onReadyForNext: () => void;
  inactivityTimeoutMs?: number;
  onInactivityTimeout?: () => void;
};

export function AttendeeConfirmStep(props: AttendeeConfirmStepProps) {
  const {
    attendee,
    checkInResult,
    isSubmitting,
    timeslotEnabled,
    timeslots,
    suggestedSlot,
    onTimeslotConfirm,
    onCheckIn,
    onReadyForNext,
    inactivityTimeoutMs,
    onInactivityTimeout,
  } = props;

  const { getAnswerText } = useFieldAnswerTextFormatter();

  const requiresTimeslotSelection = timeslotEnabled && timeslots.length > 0;
  const shouldShowReadyForNext =
    Boolean(checkInResult) ||
    (attendee?.check_in_status === 'checked_in' && !requiresTimeslotSelection);

  return (
    <WizardStep
      title="Step 3: Confirm Check-In"
      subtitle="Review attendee details, then confirm the official check-in timestamp."
      inactivityTimeoutMs={inactivityTimeoutMs}
      onInactivityTimeout={onInactivityTimeout}
      inactivityTimerMessage={(s) => `Returning to Step 1 in ${s}s due to inactivity.`}
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

          {!shouldShowReadyForNext && requiresTimeslotSelection && (
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-sm font-medium text-text">Timeslot</p>
              <p className="mt-1 text-xs text-muted">
                Tap one timeslot to confirm attendance immediately.
              </p>

              <div className="mt-3 flex flex-col gap-2">
                {timeslots.map((slot) => {
                  const isSuggested = suggestedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => onTimeslotConfirm(slot)}
                      disabled={isSubmitting}
                      className={`min-h-12 w-full rounded-xl border-2 px-4 py-3 text-center text-base font-semibold transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                        isSuggested
                          ? 'border-primary bg-primary text-white shadow-xs hover:bg-primary/90'
                          : 'border-text/40 bg-surface text-text hover:border-primary/70 hover:bg-blue-50'
                      }`}
                    >
                      <span className="block">{formatDateTime(slot, slot)}</span>
                      {isSuggested && (
                        <span className="mt-2 inline-block rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                          Suggested
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="sticky bottom-2 space-y-2 rounded-xl bg-surface/95 p-2 backdrop-blur sm:static sm:bg-transparent sm:p-0">
            {shouldShowReadyForNext ? (
              <Button type="button" fullWidth={true} size="lg" onClick={onReadyForNext}>
                Ready for Next Attendee
              </Button>
            ) : requiresTimeslotSelection ? null : (
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
          </div>
        </div>
      )}
    </WizardStep>
  );
}
