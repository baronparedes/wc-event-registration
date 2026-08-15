import { ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui';
import { Avatar } from '@/components/ui/Avatar';
import { ColorSwatchDisplay } from '@/components/ui/ColorSwatchDisplay';
import { WizardStep } from '@/components/ui/WizardStep';
import { useFieldAnswerTextFormatter } from '@/hooks/utils';
import type {
  AttendanceTimeslotConfig,
  AttendeeSearchResult,
  CheckInResult,
} from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';

import { AttendeeTimeslotSelectionPanel } from './AttendeeTimeslotSelectionPanel';

function getAnswerCardsItemClass(cardCount: number): string {
  if (cardCount <= 1) {
    return 'w-full';
  }

  if (cardCount === 2) {
    return 'w-full sm:w-[calc(50%-0.375rem)]';
  }

  return 'w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]';
}

type AttendeeConfirmStepProps = {
  attendee: AttendeeSearchResult | null;
  checkInResult: CheckInResult | null;
  currentTimeMs: number;
  isSubmitting: boolean;
  timeslotEnabled: boolean;
  timeslots: AttendanceTimeslotConfig[];
  autoWindowModeEnabled: boolean;
  activeSlot: string | null;
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
    currentTimeMs,
    isSubmitting,
    timeslotEnabled,
    timeslots,
    autoWindowModeEnabled,
    activeSlot,
    suggestedSlot,
    onTimeslotConfirm,
    onCheckIn,
    onReadyForNext,
    inactivityTimeoutMs,
    onInactivityTimeout,
  } = props;

  const { getAnswerText } = useFieldAnswerTextFormatter();

  const requiresTimeslotSelection = timeslotEnabled && timeslots.length > 0;
  const isAlreadyCheckedIn = attendee?.check_in_status === 'checked_in';
  const checkedInSlots = (attendee?.slot_records ?? []).map((record) => record.slot);
  const shouldShowReadyForNext =
    Boolean(checkInResult) || (isAlreadyCheckedIn && !requiresTimeslotSelection);

  const actionContent = (() => {
    if (shouldShowReadyForNext) {
      return (
        <Button type="button" fullWidth={true} size="lg" onClick={onReadyForNext}>
          Ready for Next Attendee
        </Button>
      );
    }

    if (requiresTimeslotSelection) {
      return null;
    }

    return (
      <Button type="button" fullWidth={true} size="lg" onClick={onCheckIn} disabled={isSubmitting}>
        {isSubmitting ? 'Checking In...' : 'Confirm Check-In'}
        <ChevronsRight
          aria-hidden="true"
          className="h-5 w-5 opacity-85 transition-transform group-hover:translate-x-0.5"
        />
      </Button>
    );
  })();

  const avatarName =
    attendee && attendee.nickname && attendee.last_name
      ? `${attendee.nickname} ${attendee.last_name}`
      : null;

  return (
    <WizardStep
      title="Step 3: Confirm Check-In"
      subtitle="Review details before confirming official attendance."
      headerAction={actionContent}
      inactivityTimeoutMs={inactivityTimeoutMs}
      onInactivityTimeout={onInactivityTimeout}
      inactivityTimerMessage={(s) => `Returning to Step 1 in ${s}s due to inactivity.`}
    >
      {!attendee && (
        <p className="text-sm text-muted">Select an attendee from search results to continue.</p>
      )}
      {attendee && (
        <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
          <div
            className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold lg:col-span-2 ${
              isAlreadyCheckedIn
                ? 'border-green-300 bg-green-100 text-green-900'
                : 'border-primary/40 bg-blue-100 text-primary'
            }`}
          >
            {isAlreadyCheckedIn ? 'Already Checked In' : 'Ready for Check-In'}
          </div>
          <div className="space-y-3 lg:col-start-1">
            <div className="rounded-xl border border-border bg-background p-3 lg:p-4">
              <div className="flex items-center gap-3">
                {avatarName && attendee.attendee_kind == 'registered' && (
                  <Avatar
                    size="lg"
                    name={avatarName}
                    avatarObjectKey={attendee.avatar_object_key}
                  />
                )}
                <div className="min-w-0">
                  <h3 className="truncate text-xl font-semibold text-text">{attendee.full_name}</h3>
                  <p className="text-sm text-muted">{attendee.member_id ?? 'Guest attendee'}</p>
                </div>
              </div>

              <dl className="mt-3 divide-y divide-border/60">
                <div className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Role</dt>
                  <dd className="text-right text-sm font-semibold text-text">
                    {attendee.role ?? 'N/A'}
                  </dd>
                </div>

                <div className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Category
                  </dt>
                  <dd className="text-right text-sm font-semibold text-text">
                    {attendee.category ?? 'N/A'}
                  </dd>
                </div>

                <div className="flex items-baseline justify-between gap-3 py-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Registered
                  </dt>
                  <dd className="text-right text-sm font-semibold text-text">
                    {formatDateTime(attendee.submitted_at)}
                  </dd>
                </div>

                {attendee.official_check_in_time && (
                  <div className="flex items-baseline justify-between gap-3 py-2">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Official check-in time
                    </dt>
                    <dd className="text-right text-sm font-semibold text-text">
                      {formatDateTime(attendee.official_check_in_time)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          <div className="space-y-3 lg:col-start-2 lg:row-span-2 lg:max-h-[32rem] lg:overflow-y-auto lg:pr-1">
            {attendee.registration_answers.length > 0 && (
              <div className="rounded-xl border-2 border-secondary/30 bg-teal-50/70 p-4 shadow-sm">
                <p className="text-sm font-semibold text-text">Registration answers</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {attendee.registration_answers.map((answer) => {
                    const answerText = getAnswerText(answer.field_type, answer);
                    return (
                      <li
                        key={answer.event_field_id}
                        className={`${getAnswerCardsItemClass(attendee.registration_answers.length)} rounded-lg border border-secondary/20 bg-surface p-2 shadow-xs`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          {answer.label}
                        </p>
                        <p className="mt-1 break-words text-base font-semibold text-text">
                          {answer.field_type === 'color_picker' ? (
                            <ColorSwatchDisplay value={answerText} fullWidth />
                          ) : (
                            answerText
                          )}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {attendee.attendance_answers.length > 0 && (
              <div className="rounded-xl border-2 border-primary/30 bg-blue-50/70 p-4 shadow-sm">
                <p className="text-sm font-semibold text-text">Attendance details</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {attendee.attendance_answers.map((answer) => {
                    const answerText = getAnswerText(answer.field_type, answer);
                    return (
                      <li
                        key={answer.attendance_field_id}
                        className={`${getAnswerCardsItemClass(attendee.attendance_answers.length)} rounded-lg border border-primary/20 bg-surface p-2 shadow-xs`}
                      >
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                          {answer.label}
                        </p>
                        <p className="mt-1 break-words text-base font-semibold text-text">
                          {answer.field_type === 'color_picker' ? (
                            <ColorSwatchDisplay value={answerText} fullWidth />
                          ) : (
                            answerText
                          )}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>

          {actionContent && <div className="lg:col-span-2">{actionContent}</div>}

          {checkInResult && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm lg:col-span-2 ${
                checkInResult.status === 'checked_in'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : checkInResult.status === 'already_checked_in'
                    ? 'border-amber-200 bg-amber-50 text-amber-800'
                    : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              <p className="font-medium">{checkInResult.message}</p>
              {checkInResult.official_check_in_time && (
                <p className="mt-1 text-sm">
                  Official time: {formatDateTime(checkInResult.official_check_in_time)}
                </p>
              )}
            </div>
          )}

          {!shouldShowReadyForNext && requiresTimeslotSelection && (
            <div className="lg:col-span-2">
              <AttendeeTimeslotSelectionPanel
                autoWindowModeEnabled={autoWindowModeEnabled}
                activeSlot={activeSlot}
                checkedInSlots={checkedInSlots}
                currentTimeMs={currentTimeMs}
                isSubmitting={isSubmitting}
                suggestedSlot={suggestedSlot}
                timeslots={timeslots}
                onTimeslotConfirm={onTimeslotConfirm}
                onReadyForNext={onReadyForNext}
              />
            </div>
          )}
        </div>
      )}
    </WizardStep>
  );
}
