import { useMemo, useState } from 'react';

import { useQueuedCheckInAttendeeMutation } from '@/hooks/domain/attendance/mutations';
import type { useAttendeesLocalCacheQuery } from '@/hooks/domain/attendance/queries';
import type { useOfflineCheckInEventSettings } from '@/hooks/domain/attendance/state';
import type { useAdminAuthQuery } from '@/hooks/domain/auth';
import type { useAdminEventQuery } from '@/hooks/domain/events';
import { useScanBuffer, useWizardStepScroll } from '@/hooks/utils';
import type { CheckInResult } from '@/lib/domain/attendance';
import { resolveActiveTimeslot, searchAttendeesWithRfidFallback } from '@/lib/domain/attendance';

import { useCheckInClock } from './useCheckInClock';
import { useCheckInEventContext } from './useCheckInEventContext';
import { useCheckInLookup } from './useCheckInLookup';
import { useCheckInSubmission } from './useCheckInSubmission';

export interface AdminCheckInPageState {
  eventId: string | undefined;
  event: ReturnType<typeof useAdminEventQuery>['data'];
  authState: ReturnType<typeof useAdminAuthQuery>['data'];
  settings: ReturnType<typeof useOfflineCheckInEventSettings>['settings'];
  cachedAttendees: ReturnType<typeof useAttendeesLocalCacheQuery>['attendees'];
  cachedAt: ReturnType<typeof useAttendeesLocalCacheQuery>['cachedAt'];
  cacheError: ReturnType<typeof useAttendeesLocalCacheQuery>['error'];
  isLoading: boolean;
  cacheLoading: boolean;
  cacheFetching: boolean;
  isCacheError: boolean;
  isUsingCachedEventOrSettings: boolean;
  attendanceEnabled: boolean;
  enforceCheckInEventWindow: boolean;
  isOutsideEventWindow: boolean;
  isCheckInBlockedByWindow: boolean;
  canWrite: boolean;
  isOnline: boolean;
  registrationOpen: boolean;
  showCheckInWizard: boolean;
  timeslotEnabled: boolean;
  timeslots: Array<{ slot_at: string; opens_at: string | null; closes_at: string | null }>;
  autoWindowModeEnabled: boolean;
  activeTimeslot: ReturnType<typeof resolveActiveTimeslot>;
  suggestedSlot: string;
  searchToken: string;
  submittedSearchToken: string;
  selectedRegistrationId: string | null;
  confirmedRegistrationId: string | null;
  checkInResult: CheckInResult | null;
  nowMs: number;
  registeredCount: number;
  results: ReturnType<typeof searchAttendeesWithRfidFallback>;
  selectedResultId: string | null;
  confirmedAttendee: ReturnType<typeof searchAttendeesWithRfidFallback>[0] | null;
  activeStep: 1 | 2 | 3;
  isAwaitingNextAttendee: boolean;
  cacheStatusMessage: string | null;
  pendingCheckInCount: number;
  lastQueueError: string | null;
  showQueueStatusBanner: boolean;
  setSearchToken: (token: string) => void;
  setSubmittedSearchToken: (token: string) => void;
  setSelectedRegistrationId: (id: string | null) => void;
  setConfirmedRegistrationId: (id: string | null) => void;
  setCheckInResult: (result: CheckInResult | null) => void;
  handleRefreshCache: () => void;
  handleScanFromConfirmation: (scanValue: string) => void;
  handleSubmitSearch: () => void;
  handleBackToLookup: () => void;
  handleReadyForNext: () => void;
  handleBackToMatches: () => void;
  handleConfirmSelection: (registrationId: string) => void;
  submitCheckIn: (slotOverride?: string, keepConfirmationVisible?: boolean) => Promise<void>;
  handleCheckIn: () => void;
}

export function useAdminCheckInPageState(
  eventId: string | undefined,
  stepRefs: React.RefObject<HTMLDivElement | null>[],
): AdminCheckInPageState {
  const nowMs = useCheckInClock();
  const context = useCheckInEventContext(eventId, nowMs);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const lookup = useCheckInLookup({
    cachedAttendees: context.cachedAttendees,
    onCheckInResultChange: setCheckInResult,
  });
  const {
    enqueueCheckIn,
    pendingCount: pendingCheckInCount,
    lastError: lastQueueError,
  } = useQueuedCheckInAttendeeMutation(eventId, {
    refreshCache: context.refreshCache,
    updateAttendee: context.updateAttendee,
  });
  const timeslotEnabled = context.settings?.timeslot_enabled ?? false;
  const timeslots = context.settings?.timeslots ?? [];
  const submission = useCheckInSubmission({
    eventId,
    attendee: lookup.confirmedAttendee,
    results: lookup.results,
    submittedSearchToken: lookup.submittedSearchToken,
    confirmedRegistrationId: lookup.confirmedRegistrationId,
    checkInResult,
    nowMs,
    timeslotEnabled,
    timeslots,
    enqueueCheckIn,
    onCheckInResultChange: setCheckInResult,
    onComplete: lookup.handleReadyForNext,
    lastAutoSubmittedTokenRef: lookup.lastAutoSubmittedTokenRef,
  });
  const activeStep: 1 | 2 | 3 = lookup.confirmedAttendee
    ? 3
    : lookup.submittedSearchToken.trim().length > 0 && lookup.results.length > 0
      ? 2
      : 1;
  const isAwaitingNextAttendee =
    activeStep === 3 &&
    (Boolean(checkInResult) || lookup.confirmedAttendee?.check_in_status === 'checked_in');
  const cacheStatusMessage = useMemo(() => {
    if (
      !context.cachedAttendees ||
      context.cacheLoading ||
      context.cacheFetching ||
      context.isCacheError
    ) {
      return context.cacheStatusMessage;
    }
    const queueSuffix = pendingCheckInCount > 0 ? ` · ${pendingCheckInCount} queued` : '';
    return `${context.cachedAttendees.length} attendees cached${queueSuffix}${
      context.cachedAt ? ` · Updated ${new Date(context.cachedAt).toLocaleTimeString()}` : ''
    }`;
  }, [
    context.cacheStatusMessage,
    context.cachedAt,
    context.cachedAttendees,
    context.cacheFetching,
    context.cacheLoading,
    context.isCacheError,
    pendingCheckInCount,
  ]);

  useScanBuffer(lookup.handleScanFromConfirmation, isAwaitingNextAttendee);
  useWizardStepScroll(activeStep, stepRefs);

  return {
    eventId,
    event: context.event,
    authState: context.authState,
    settings: context.settings,
    cachedAttendees: context.cachedAttendees,
    cachedAt: context.cachedAt,
    cacheError: context.cacheError,
    isLoading: context.isLoading,
    cacheLoading: context.cacheLoading,
    cacheFetching: context.cacheFetching,
    isCacheError: context.isCacheError,
    isUsingCachedEventOrSettings: context.isUsingCachedEventOrSettings,
    attendanceEnabled: context.attendanceEnabled,
    enforceCheckInEventWindow: context.enforceCheckInEventWindow,
    isOutsideEventWindow: context.isOutsideEventWindow,
    isCheckInBlockedByWindow: context.isCheckInBlockedByWindow,
    canWrite: context.canWrite,
    isOnline: context.isOnline,
    registrationOpen: context.registrationOpen,
    showCheckInWizard: context.attendanceEnabled,
    timeslotEnabled,
    timeslots,
    autoWindowModeEnabled: submission.autoWindowModeEnabled,
    activeTimeslot: submission.activeTimeslot,
    suggestedSlot: submission.suggestedSlot,
    searchToken: lookup.searchToken,
    submittedSearchToken: lookup.submittedSearchToken,
    selectedRegistrationId: lookup.selectedRegistrationId,
    confirmedRegistrationId: lookup.confirmedRegistrationId,
    checkInResult,
    nowMs,
    registeredCount: context.cachedAttendees?.length ?? 0,
    results: lookup.results,
    selectedResultId: lookup.selectedResultId,
    confirmedAttendee: lookup.confirmedAttendee,
    activeStep,
    isAwaitingNextAttendee,
    cacheStatusMessage,
    pendingCheckInCount,
    lastQueueError,
    showQueueStatusBanner: pendingCheckInCount > 0 || Boolean(lastQueueError),
    setSearchToken: lookup.setSearchToken,
    setSubmittedSearchToken: lookup.setSubmittedSearchToken,
    setSelectedRegistrationId: lookup.setSelectedRegistrationId,
    setConfirmedRegistrationId: lookup.setConfirmedRegistrationId,
    setCheckInResult,
    handleRefreshCache: context.handleRefreshCache,
    handleScanFromConfirmation: lookup.handleScanFromConfirmation,
    handleSubmitSearch: lookup.handleSubmitSearch,
    handleBackToLookup: lookup.handleBackToLookup,
    handleReadyForNext: lookup.handleReadyForNext,
    handleBackToMatches: lookup.handleBackToMatches,
    handleConfirmSelection: lookup.handleConfirmSelection,
    submitCheckIn: submission.submitCheckIn,
    handleCheckIn: submission.handleCheckIn,
  };
}
