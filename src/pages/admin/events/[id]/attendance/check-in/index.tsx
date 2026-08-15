import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { Button, EventHeaderCard } from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { ROUTE_PATHS, TIMING, toAdminEventAttendance } from '@/config/constants';
import { useQueuedCheckInAttendeeMutation } from '@/hooks/domain/attendance/mutations';
import {
  useAttendanceSettingsQuery,
  useAttendeesLocalCacheQuery,
} from '@/hooks/domain/attendance/queries';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useScanBuffer, useWizardStepScroll } from '@/hooks/utils';
import type { CheckInResult } from '@/lib/domain/attendance';
import {
  isAutoWindowModeEnabled,
  resolveActiveTimeslot,
  searchAttendeesWithRfidFallback,
} from '@/lib/domain/attendance';
import { canAdminPerform } from '@/lib/domain/auth';
import { formatDateTime } from '@/lib/infrastructure';

import {
  AttendeeCacheStatusBar,
  AttendeeConfirmStep,
  AttendeeSearchStep,
  AttendeeSelectStep,
} from './components';

function isRegistrationOpenNow(event: {
  registration_mode: 'open' | 'closed';
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  nowMs: number;
}): boolean {
  if (event.registration_mode !== 'open') {
    return false;
  }

  const now = event.nowMs;
  const opensAt = event.registration_opens_at ? Date.parse(event.registration_opens_at) : null;
  const closesAt = event.registration_closes_at ? Date.parse(event.registration_closes_at) : null;

  if (opensAt !== null && Number.isFinite(opensAt) && now < opensAt) {
    return false;
  }

  if (closesAt !== null && Number.isFinite(closesAt) && now >= closesAt) {
    return false;
  }

  return true;
}

function isWithinEventWindow(
  event: { starts_at: string | null; ends_at: string | null },
  nowMs: number,
): boolean {
  const startMs = event.starts_at ? Date.parse(event.starts_at) : Number.NaN;
  const endMs = event.ends_at ? Date.parse(event.ends_at) : Number.NaN;

  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return false;
  }

  return nowMs >= startMs && nowMs <= endMs;
}

export function AdminAttendanceCheckInPage() {
  const { id: eventId } = useParams<{ id: string }>();

  const [searchToken, setSearchToken] = useState('');
  const [submittedSearchToken, setSubmittedSearchToken] = useState('');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [confirmedRegistrationId, setConfirmedRegistrationId] = useState<string | null>(null);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const searchStepRef = useRef<HTMLDivElement | null>(null);
  const selectStepRef = useRef<HTMLDivElement | null>(null);
  const confirmStepRef = useRef<HTMLDivElement | null>(null);

  const { data: event, isLoading: eventLoading } = useAdminEventQuery(eventId);
  const { data: authState } = useAdminAuthQuery();
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettingsQuery(eventId);
  const attendanceEnabled = settings?.attendance_enabled ?? false;
  const enforceCheckInEventWindow = settings?.enforce_check_in_event_window ?? true;
  const isOutsideEventWindow = event ? !isWithinEventWindow(event, nowMs) : false;
  const isCheckInBlockedByWindow =
    attendanceEnabled && enforceCheckInEventWindow && isOutsideEventWindow;
  const shouldListenRealtime = attendanceEnabled && !isCheckInBlockedByWindow;
  const timeslotEnabled = settings?.timeslot_enabled ?? false;
  const timeslots = useMemo(() => settings?.timeslots ?? [], [settings]);
  const autoWindowModeEnabled = useMemo(
    () =>
      isAutoWindowModeEnabled({
        timeslot_enabled: timeslotEnabled,
        timeslots,
      }),
    [timeslotEnabled, timeslots],
  );
  const activeTimeslot = useMemo(
    () => resolveActiveTimeslot(new Date(nowMs).toISOString(), timeslots),
    [nowMs, timeslots],
  );
  const {
    attendees: cachedAttendees,
    cachedAt,
    isLoading: cacheLoading,
    isFetching: cacheFetching,
    isError: isCacheError,
    error: cacheError,
    refresh: refreshCache,
    updateAttendee,
  } = useAttendeesLocalCacheQuery(eventId, { realtimeEnabled: shouldListenRealtime });
  const {
    enqueueCheckIn,
    pendingCount: pendingCheckInCount,
    lastError: lastQueueError,
  } = useQueuedCheckInAttendeeMutation(eventId, { refreshCache, updateAttendee });
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const showQueueStatusBanner = pendingCheckInCount > 0 || Boolean(lastQueueError);

  const isLoading = eventLoading || settingsLoading;
  const registeredCount = cachedAttendees?.length ?? 0;

  const results = useMemo(() => {
    if (!submittedSearchToken.trim() || !cachedAttendees) return [];
    return searchAttendeesWithRfidFallback(cachedAttendees, submittedSearchToken);
  }, [cachedAttendees, submittedSearchToken]);
  const registrationOpen = event
    ? isRegistrationOpenNow({
        registration_mode: event.registration_mode,
        registration_opens_at: event.registration_opens_at,
        registration_closes_at: event.registration_closes_at,
        nowMs,
      })
    : false;
  const showCheckInWizard = attendanceEnabled && !isCheckInBlockedByWindow;
  const suggestedSlot = useMemo(() => {
    if (!timeslotEnabled || timeslots.length === 0) {
      return '';
    }

    if (autoWindowModeEnabled) {
      return activeTimeslot?.slot_at ?? '';
    }

    const validSlots = timeslots
      .map((slot) => ({ slot: slot.slot_at, time: Date.parse(slot.slot_at) }))
      .filter((entry) => Number.isFinite(entry.time))
      .sort((a, b) => a.time - b.time);

    if (validSlots.length === 0) {
      return timeslots[0]?.slot_at ?? '';
    }

    const latestPastOrCurrent = [...validSlots].reverse().find((entry) => entry.time <= nowMs);
    if (latestPastOrCurrent) {
      return latestPastOrCurrent.slot;
    }

    return validSlots[0].slot;
  }, [activeTimeslot, autoWindowModeEnabled, nowMs, timeslotEnabled, timeslots]);
  const selectedResultId = useMemo(() => {
    if (selectedRegistrationId) {
      return results.some((result) => result.registration_id === selectedRegistrationId)
        ? selectedRegistrationId
        : null;
    }

    return results.length === 1 ? results[0].registration_id : null;
  }, [results, selectedRegistrationId]);
  const confirmedAttendee = useMemo(
    () => results.find((result) => result.registration_id === confirmedRegistrationId) ?? null,
    [confirmedRegistrationId, results],
  );

  const activeStep = useMemo(() => {
    if (confirmedAttendee) {
      return 3;
    }

    // Stay on step 1 if search submitted but no results found
    if (submittedSearchToken.trim().length > 0 && results.length === 0) {
      return 1;
    }

    if (submittedSearchToken.trim().length > 0) {
      return 2;
    }

    return 1;
  }, [confirmedAttendee, submittedSearchToken, results.length]);

  const isAwaitingNextAttendee =
    activeStep === 3 &&
    (Boolean(checkInResult) || confirmedAttendee?.check_in_status === 'checked_in');

  const cacheStatusMessage = useMemo(() => {
    if (cacheLoading || cacheFetching) {
      return 'Loading attendee list...';
    }

    if (isCacheError) {
      return cacheError instanceof Error ? cacheError.message : 'Failed to load attendee cache.';
    }

    if (cachedAttendees) {
      const queueSuffix = pendingCheckInCount > 0 ? ` · ${pendingCheckInCount} queued` : '';
      return `${cachedAttendees.length} attendees cached${queueSuffix}${
        cachedAt ? ` · Updated ${new Date(cachedAt).toLocaleTimeString()}` : ''
      }`;
    }

    return null;
  }, [
    cacheError,
    cacheFetching,
    cacheLoading,
    cachedAt,
    cachedAttendees,
    isCacheError,
    pendingCheckInCount,
  ]);

  useWizardStepScroll(activeStep, [searchStepRef, selectStepRef, confirmStepRef]);

  const handleScanFromConfirmation = useCallback((scanValue: string) => {
    const normalized = scanValue.trim();
    if (!normalized) {
      return;
    }

    setSearchToken(normalized);
    setSubmittedSearchToken(normalized);
    setSelectedRegistrationId(null);
    setConfirmedRegistrationId(null);
    setCheckInResult(null);
  }, []);

  useScanBuffer(handleScanFromConfirmation, isAwaitingNextAttendee);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  function handleSubmitSearch() {
    if (isCheckInBlockedByWindow) {
      toast.error('Check-in is currently blocked outside the event date-time window.');
      return;
    }

    const normalized = searchToken.trim();
    if (!normalized) return;

    setSubmittedSearchToken(normalized);
    setSelectedRegistrationId(null);
    setConfirmedRegistrationId(null);
    setCheckInResult(null);
  }

  function handleClearSearch() {
    setSearchToken('');
    setSubmittedSearchToken('');
    setSelectedRegistrationId(null);
    setConfirmedRegistrationId(null);
    setCheckInResult(null);
  }

  const handleBackToLookup = useCallback(() => {
    setSearchToken('');
    setSubmittedSearchToken('');
    setSelectedRegistrationId(null);
    setConfirmedRegistrationId(null);
    setCheckInResult(null);
  }, []);

  function handleReadyForNext() {
    handleClearSearch();
  }

  function handleBackToMatches() {
    setConfirmedRegistrationId(null);
    setCheckInResult(null);
  }

  function handleConfirmSelection(registrationId: string) {
    if (!registrationId) {
      return;
    }

    setConfirmedRegistrationId(registrationId);
    setCheckInResult(null);
  }

  async function submitCheckIn(slotOverride?: string) {
    if (!eventId || !confirmedAttendee) return;

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

    const registrationId =
      confirmedAttendee.attendee_kind === 'registered'
        ? confirmedAttendee.registration_id
        : undefined;
    const publicRegistrationId =
      confirmedAttendee.attendee_kind === 'public'
        ? (confirmedAttendee.public_registration_id ?? confirmedAttendee.registration_id)
        : undefined;
    const payload = {
      event_id: eventId,
      attendee_kind: confirmedAttendee.attendee_kind,
      registration_id: registrationId,
      public_registration_id: publicRegistrationId,
      slot: timeslotEnabled ? finalSlot || undefined : undefined,
    };

    try {
      const { queued } = enqueueCheckIn(payload, confirmedAttendee.registration_id);

      if (!queued) {
        toast.info('This check-in is already queued for sync.');
      } else {
        toast.success('Check-in queued. Syncing in the background.');
      }

      setCheckInResult(null);
      handleReadyForNext();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to queue check-in.';
      toast.error(message);
    }
  }

  function handleCheckIn() {
    void submitCheckIn();
  }

  if (!eventId) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Check-In" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Invalid event ID.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (isLoading) {
    return (
      <AdminPageShell>
        <AdminPageShell.Content isLoading={true} loadingMessage="Loading check-in tools...">
          {null}
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (!event) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Check-In" />
        <AdminPageShell.Content>
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Event not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminEvents}>
              Back to events
            </Link>
          </div>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header title="Event Check-In" />

      <EventHeaderCard
        defaultExpanded={false}
        isLoading={false}
        isError={false}
        isGateReady={false}
        eventWindowText={null}
        availability={{
          status: 'available',
          event,
          registration_count: registeredCount,
          reason: 'available',
        }}
      />

      {!attendanceEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Attendance tracking is disabled</p>
          <p className="mt-1 text-xs text-amber-700">
            {canWrite ? (
              <>
                Enable attendance tracking in{' '}
                <ActionLink to={toAdminEventAttendance(eventId)}>Attendance Settings</ActionLink> to
                use check-in.
              </>
            ) : (
              'Attendance settings must be enabled by an admin before kiosk check-in can be used.'
            )}
          </p>
        </div>
      )}

      {isCheckInBlockedByWindow && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            Check-in is restricted to the event date-time window.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Allowed window:{' '}
            {event
              ? `${formatDateTime(event.starts_at)} to ${formatDateTime(event.ends_at)}`
              : 'Unavailable'}
          </p>
        </div>
      )}

      {showCheckInWizard && attendanceEnabled && (
        <AttendeeCacheStatusBar
          message={cacheStatusMessage}
          isError={isCacheError}
          isRefreshing={cacheFetching}
          onRefresh={refreshCache}
        />
      )}

      {showCheckInWizard && showQueueStatusBanner && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            {pendingCheckInCount > 0
              ? `${pendingCheckInCount} check-in${pendingCheckInCount === 1 ? '' : 's'} queued for background sync.`
              : 'A queued check-in needs attention.'}
          </p>
          {lastQueueError && (
            <p className="mt-1 text-xs text-blue-700">Last sync issue: {lastQueueError}</p>
          )}
        </div>
      )}

      {showCheckInWizard && (
        <StepIndicator
          currentStep={activeStep}
          totalSteps={3}
          labels={['Lookup', 'Select', 'Confirm']}
        />
      )}

      <AdminPageShell.Content>
        {showCheckInWizard && activeStep === 1 && (
          <div ref={searchStepRef} className="space-y-2 scroll-mt-24">
            <AttendeeSearchStep
              searchToken={searchToken}
              submittedSearchToken={submittedSearchToken}
              isSearching={cacheFetching}
              disabled={!attendanceEnabled || isCheckInBlockedByWindow || cacheLoading}
              results={results}
              isSearchError={isCacheError}
              onSearchTokenChange={setSearchToken}
              onSubmit={handleSubmitSearch}
              notFoundActions={
                <div className="flex flex-wrap gap-2">
                  {!registrationOpen && (
                    <p className="text-sm text-muted">
                      Registration is closed. Ask an admin to reopen registration before check-in.
                    </p>
                  )}
                </div>
              }
            />
          </div>
        )}

        {showCheckInWizard && activeStep === 2 && (
          <div ref={selectStepRef} className="space-y-2 scroll-mt-24">
            <AttendeeSelectStep
              results={results}
              selectedResultId={selectedResultId}
              searchError={
                isCacheError && cacheError && cacheError instanceof Error
                  ? new Error('Failed to load attendee cache')
                  : cacheError || null
              }
              onSelect={(registrationId) => {
                setSelectedRegistrationId(registrationId);
                setConfirmedRegistrationId(null);
                setCheckInResult(null);
              }}
              onConfirmSelection={handleConfirmSelection}
              inactivityTimeoutMs={TIMING.registrationWizardConfirmTimeoutMs}
              onInactivityTimeout={handleBackToLookup}
            />

            <Button
              type="button"
              size="lg"
              variant="accent"
              onClick={handleBackToLookup}
              className="w-full"
            >
              Back to Lookup
            </Button>
          </div>
        )}

        {showCheckInWizard && activeStep === 3 && (
          <div ref={confirmStepRef} className="space-y-2 scroll-mt-24">
            <AttendeeConfirmStep
              attendee={confirmedAttendee}
              checkInResult={checkInResult}
              currentTimeMs={nowMs}
              isSubmitting={false}
              timeslotEnabled={timeslotEnabled}
              timeslots={timeslots}
              autoWindowModeEnabled={autoWindowModeEnabled}
              activeSlot={activeTimeslot?.slot_at ?? null}
              suggestedSlot={suggestedSlot}
              onTimeslotConfirm={(slot) => {
                void submitCheckIn(slot);
              }}
              onCheckIn={handleCheckIn}
              onReadyForNext={handleReadyForNext}
              inactivityTimeoutMs={TIMING.registrationWizardStepThreeTimeoutMs}
              onInactivityTimeout={handleBackToLookup}
            />

            <div className="flex flex-wrap gap-2">
              {results.length > 1 && (
                <Button
                  type="button"
                  variant="primaryOutline"
                  onClick={handleBackToMatches}
                  className="w-full"
                >
                  Back to Matches
                </Button>
              )}
              {!(
                checkInResult ||
                (confirmedAttendee?.check_in_status === 'checked_in' &&
                  !(timeslotEnabled && timeslots.length > 0))
              ) && (
                <Button
                  type="button"
                  variant="accent"
                  onClick={handleBackToLookup}
                  className="w-full"
                >
                  Start New Lookup
                </Button>
              )}
            </div>
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
