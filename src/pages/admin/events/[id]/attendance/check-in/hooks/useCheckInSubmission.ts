import { useCallback, useMemo } from 'react';

import { toast } from 'sonner';

import type { useQueuedCheckInAttendeeMutation } from '@/hooks/domain/attendance';
import type { CheckInResult } from '@/lib/domain/attendance';
import {
  isAutoWindowModeEnabled,
  resolveActiveTimeslot,
  searchAttendeesWithRfidFallback,
} from '@/lib/domain/attendance';

import { resolveSuggestedTimeslot } from '../utils';

type Attendee = ReturnType<typeof searchAttendeesWithRfidFallback>[0] | null;
type Timeslot = { slot_at: string; opens_at: string | null; closes_at: string | null };

interface UseCheckInSubmissionOptions {
  eventId: string | undefined;
  attendee: Attendee;
  nowMs: number;
  timeslotEnabled: boolean;
  timeslots: Timeslot[];
  enqueueCheckIn: ReturnType<typeof useQueuedCheckInAttendeeMutation>['enqueueCheckIn'];
  onCheckInResultChange: (result: CheckInResult | null) => void;
  onComplete: () => void;
}

export function useCheckInSubmission({
  eventId,
  attendee,
  nowMs,
  timeslotEnabled,
  timeslots,
  enqueueCheckIn,
  onCheckInResultChange,
  onComplete,
}: UseCheckInSubmissionOptions) {
  const autoWindowModeEnabled = useMemo(
    () => isAutoWindowModeEnabled({ timeslot_enabled: timeslotEnabled, timeslots }),
    [timeslotEnabled, timeslots],
  );
  const activeTimeslot = useMemo(
    () => resolveActiveTimeslot(new Date(nowMs).toISOString(), timeslots),
    [nowMs, timeslots],
  );
  const suggestedSlot = useMemo(
    () =>
      resolveSuggestedTimeslot({
        timeslotEnabled,
        timeslots,
        autoWindowModeEnabled,
        activeTimeslot,
        nowMs,
      }),
    [activeTimeslot, autoWindowModeEnabled, nowMs, timeslotEnabled, timeslots],
  );

  const submitCheckIn = useCallback(
    async (
      slotOverride?: string,
      keepConfirmationVisible: boolean = false,
      attendeeOverride?: Attendee,
    ) => {
      const targetAttendee = attendeeOverride ?? attendee;
      if (!eventId || !targetAttendee) return;

      const finalSlot = slotOverride?.trim() ?? '';
      const selectedSlot = finalSlot
        ? (timeslots.find((slot) => slot.slot_at === finalSlot) ?? null)
        : null;
      const isSelectedSlotUnrestricted = Boolean(
        selectedSlot && (!selectedSlot.opens_at || !selectedSlot.closes_at),
      );

      if (autoWindowModeEnabled && !activeTimeslot && !isSelectedSlotUnrestricted) {
        toast.error('No active timeslot window right now.');
        return;
      }
      if (timeslotEnabled && timeslots.length > 0 && !finalSlot) {
        toast.error('Timeslot selection is required for this event.');
        return;
      }

      const payload = {
        event_id: eventId,
        attendee_kind: targetAttendee.attendee_kind,
        registration_id:
          targetAttendee.attendee_kind === 'registered'
            ? targetAttendee.registration_id
            : undefined,
        public_registration_id:
          targetAttendee.attendee_kind === 'public'
            ? (targetAttendee.public_registration_id ?? targetAttendee.registration_id)
            : undefined,
        slot: timeslotEnabled ? finalSlot || undefined : undefined,
      };

      try {
        const { queued } = enqueueCheckIn(payload, targetAttendee.registration_id);
        if (queued) {
          toast.success('Check-in queued. Syncing in the background.');
        } else {
          toast.info('This check-in is already queued for sync.');
        }
        onCheckInResultChange(null);
        if (!keepConfirmationVisible) {
          onComplete();
        }
      } catch (error) {
        let message = 'Failed to queue check-in.';
        if (error instanceof Error) {
          message = error.message;
        }
        toast.error(message);
      }
    },
    [
      activeTimeslot,
      attendee,
      autoWindowModeEnabled,
      enqueueCheckIn,
      eventId,
      onCheckInResultChange,
      onComplete,
      timeslotEnabled,
      timeslots,
    ],
  );

  const handleCheckIn = useCallback(() => void submitCheckIn(), [submitCheckIn]);

  return { autoWindowModeEnabled, activeTimeslot, suggestedSlot, submitCheckIn, handleCheckIn };
}
