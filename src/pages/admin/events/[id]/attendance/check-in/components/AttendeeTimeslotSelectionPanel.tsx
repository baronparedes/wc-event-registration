import { ChevronsRight } from 'lucide-react';

import { Button } from '@/components/ui';
import type { AttendanceTimeslotConfig } from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';

type AttendeeTimeslotSelectionPanelProps = {
  autoWindowModeEnabled: boolean;
  activeSlot: string | null;
  checkedInSlots: string[];
  currentTimeMs: number;
  isSubmitting: boolean;
  suggestedSlot: string;
  timeslots: AttendanceTimeslotConfig[];
  onTimeslotConfirm: (slot: string) => void;
  onReadyForNext: () => void;
};

export function AttendeeTimeslotSelectionPanel(props: AttendeeTimeslotSelectionPanelProps) {
  const {
    autoWindowModeEnabled,
    activeSlot,
    checkedInSlots,
    currentTimeMs,
    isSubmitting,
    suggestedSlot,
    timeslots,
    onTimeslotConfirm,
    onReadyForNext,
  } = props;

  const checkedInSlotSet = new Set(checkedInSlots);

  function isUnrestrictedSlot(slot: AttendanceTimeslotConfig): boolean {
    return !slot.opens_at || !slot.closes_at;
  }

  const visibleTimeslots = timeslots.filter((slot) => {
    if (isUnrestrictedSlot(slot)) {
      return true;
    }

    const opensAtMs = Date.parse(slot.opens_at!);
    if (!Number.isFinite(opensAtMs)) {
      return true;
    }

    return opensAtMs <= currentTimeMs;
  });

  const hasUnrestrictedSlot = visibleTimeslots.some(isUnrestrictedSlot);
  const isBlockedByMissingActiveWindow =
    autoWindowModeEnabled && !activeSlot && !hasUnrestrictedSlot;

  const actionableTimeslots = visibleTimeslots.filter((slot) => {
    if (!autoWindowModeEnabled) {
      return true;
    }

    if (activeSlot) {
      return slot.slot_at === activeSlot;
    }

    return isUnrestrictedSlot(slot);
  });

  if (isBlockedByMissingActiveWindow || actionableTimeslots.length === 0) {
    return null;
  }

  const remainingActionableTimeslots = actionableTimeslots.filter(
    (slot) => !checkedInSlotSet.has(slot.slot_at),
  );

  if (remainingActionableTimeslots.length === 0) {
    return (
      <div className="space-y-2.5 rounded-xl border border-border bg-background p-3">
        <p className="text-sm font-semibold text-text">Already checked in for this timeslot.</p>
        <Button type="button" onClick={onReadyForNext} fullWidth={true} disabled={isSubmitting}>
          Ready for Next Attendee
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 rounded-xl border border-border bg-background p-3">
      <p className="text-sm font-semibold text-text">Choose check-in time</p>
      <div className="flex flex-col gap-2.5">
        {remainingActionableTimeslots.map((slot) => {
          const isUnrestricted = isUnrestrictedSlot(slot);
          const isSuggested =
            suggestedSlot === slot.slot_at || remainingActionableTimeslots.length === 1;
          const isDisabled = isSubmitting;

          return (
            <Button
              key={`${slot.slot_at}-${slot.opens_at ?? 'none'}-${slot.closes_at ?? 'none'}`}
              type="button"
              onClick={() => onTimeslotConfirm(slot.slot_at)}
              disabled={isDisabled}
              variant={isSuggested ? 'default' : 'outline'}
              aria-label={
                isUnrestricted
                  ? 'Confirm Check-In'
                  : `Select timeslot ${formatDateTime(slot.slot_at, slot.slot_at)}`
              }
            >
              <div className="flex items-center justify-between gap-3">
                <span className="block text-lg leading-tight md:text-xl">
                  {isUnrestricted ? 'Confirm Check-In' : formatDateTime(slot.slot_at, slot.slot_at)}
                </span>
                {isSuggested && (
                  <ChevronsRight
                    aria-hidden="true"
                    className="h-5 w-5 opacity-85 transition-transform group-hover:translate-x-0.5"
                  />
                )}
              </div>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
