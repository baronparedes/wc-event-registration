import { useCallback, useEffect, useMemo } from 'react';

import { toast } from 'sonner';

import type { useQueuedCheckInAttendeeMutation } from '@/hooks/domain/attendance/mutations';
import type { CheckInResult } from '@/lib/domain/attendance';
import {
  isAutoWindowModeEnabled,
  resolveActiveTimeslot,
  searchAttendeesWithRfidFallback,
} from '@/lib/domain/attendance';

import { isDirectMemberIdMatch, resolveSuggestedTimeslot } from '../utils';

type Attendee = ReturnType<typeof searchAttendeesWithRfidFallback>[0] | null;
type Timeslot = { slot_at: string; opens_at: string | null; closes_at: string | null };

interface UseCheckInSubmissionOptions {
  eventId: string | undefined;
  attendee: Attendee;
  results: ReturnType<typeof searchAttendeesWithRfidFallback>;
  submittedSearchToken: string;
  confirmedRegistrationId: string | null;
  checkInResult: CheckInResult | null;
  nowMs: number;
  timeslotEnabled: boolean;
  timeslots: Timeslot[];
  enqueueCheckIn: ReturnType<typeof useQueuedCheckInAttendeeMutation>['enqueueCheckIn'];
  onCheckInResultChange: (result: CheckInResult | null) => void;
  onComplete: () => void;
  lastAutoSubmittedTokenRef: React.RefObject<string>;
}

export function useCheckInSubmission({
  eventId,
  attendee,
  results,
  submittedSearchToken,
  confirmedRegistrationId,
  checkInResult,
  nowMs,
  timeslotEnabled,
  timeslots,
  enqueueCheckIn,
  onCheckInResultChange,
  onComplete,
  lastAutoSubmittedTokenRef,
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
    async (slotOverride?: string, keepConfirmationVisible: boolean = false) => {
      if (!eventId || !attendee) return;

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
        attendee_kind: attendee.attendee_kind,
        registration_id:
          attendee.attendee_kind === 'registered' ? attendee.registration_id : undefined,
        public_registration_id:
          attendee.attendee_kind === 'public'
            ? (attendee.public_registration_id ?? attendee.registration_id)
            : undefined,
        slot: timeslotEnabled ? finalSlot || undefined : undefined,
      };

      try {
        const { queued } = enqueueCheckIn(payload, attendee.registration_id);
        toast[queued ? 'success' : 'info'](
          queued
            ? 'Check-in queued. Syncing in the background.'
            : 'This check-in is already queued for sync.',
        );
        onCheckInResultChange(null);
        if (!keepConfirmationVisible) onComplete();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to queue check-in.');
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

  useEffect(() => {
    const shouldAutoSubmit =
      results.length === 1 &&
      isDirectMemberIdMatch(submittedSearchToken, results) &&
      confirmedRegistrationId &&
      attendee &&
      !checkInResult &&
      lastAutoSubmittedTokenRef.current !== submittedSearchToken;

    if (!shouldAutoSubmit) return;

    lastAutoSubmittedTokenRef.current = submittedSearchToken;
    const timeoutId = setTimeout(() => void submitCheckIn(suggestedSlot, true), 0);
    return () => clearTimeout(timeoutId);
  }, [
    attendee,
    checkInResult,
    confirmedRegistrationId,
    lastAutoSubmittedTokenRef,
    results,
    submittedSearchToken,
    submitCheckIn,
    suggestedSlot,
  ]);

  const handleCheckIn = useCallback(() => void submitCheckIn(), [submitCheckIn]);

  return { autoWindowModeEnabled, activeTimeslot, suggestedSlot, submitCheckIn, handleCheckIn };
}
