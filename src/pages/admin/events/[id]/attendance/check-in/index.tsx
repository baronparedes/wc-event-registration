import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { Button, EventHeaderCard } from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
import { StepIndicator } from '@/components/ui/StepIndicator';
import {
  ROUTE_PATHS,
  TIMING,
  toAdminEventAttendance,
  toAdminEventDetail,
  toEventRegistration,
} from '@/config/constants';
import { useCheckInAttendeeMutation } from '@/hooks/domain/attendance/mutations';
import {
  useAttendanceSettingsQuery,
  useSearchAttendeesQuery,
} from '@/hooks/domain/attendance/queries';
import { useAdminEventQuery, useUpdateEventMutation } from '@/hooks/domain/events';
import { useAdminRegistrationsQuery } from '@/hooks/domain/registrations';
import { useWizardStepScroll } from '@/hooks/utils';
import type { CheckInResult } from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { AttendeeConfirmStep, AttendeeSearchStep, AttendeeSelectStep } from './components';

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleString('sv-SE', { timeZone: 'Asia/Manila' }).slice(0, 16).replace(' ', 'T');
}

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
  const [suggestedSlotNowMs, setSuggestedSlotNowMs] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const searchStepRef = useRef<HTMLDivElement | null>(null);
  const selectStepRef = useRef<HTMLDivElement | null>(null);
  const confirmStepRef = useRef<HTMLDivElement | null>(null);

  const { data: event, isLoading: eventLoading } = useAdminEventQuery(eventId);
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettingsQuery(eventId);
  const attendanceEnabled = settings?.attendance_enabled ?? false;
  const enforceCheckInEventWindow = settings?.enforce_check_in_event_window ?? true;
  const timeslotEnabled = settings?.timeslot_enabled ?? false;
  const timeslots = useMemo(() => settings?.timeslots ?? [], [settings]);
  const registrationsQuery = useAdminRegistrationsQuery(eventId ?? '', { pageSize: 1 });
  const searchQuery = useSearchAttendeesQuery(eventId, submittedSearchToken);
  const checkInMutation = useCheckInAttendeeMutation();
  const updateEventMutation = useUpdateEventMutation();

  const isLoading = eventLoading || settingsLoading;
  const registeredCount = registrationsQuery.data?.totalCount ?? 0;

  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);
  const registrationOpen = event
    ? isRegistrationOpenNow({
        registration_mode: event.registration_mode,
        registration_opens_at: event.registration_opens_at,
        registration_closes_at: event.registration_closes_at,
        nowMs,
      })
    : false;
  const isOutsideEventWindow = event ? !isWithinEventWindow(event, nowMs) : false;
  const isCheckInBlockedByWindow =
    attendanceEnabled && enforceCheckInEventWindow && isOutsideEventWindow;
  const showCheckInWizard = attendanceEnabled && !isCheckInBlockedByWindow;
  const suggestedSlot = useMemo(() => {
    if (!timeslotEnabled || timeslots.length === 0) {
      return '';
    }

    const validSlots = timeslots
      .map((slot) => ({ slot, time: Date.parse(slot) }))
      .filter((entry) => Number.isFinite(entry.time))
      .sort((a, b) => a.time - b.time);

    if (validSlots.length === 0) {
      return timeslots[0] ?? '';
    }

    if (suggestedSlotNowMs === null) {
      return validSlots[0].slot;
    }

    const latestPastOrCurrent = [...validSlots]
      .reverse()
      .find((entry) => entry.time <= suggestedSlotNowMs);
    if (latestPastOrCurrent) {
      return latestPastOrCurrent.slot;
    }

    return validSlots[0].slot;
  }, [timeslotEnabled, timeslots, suggestedSlotNowMs]);
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
  const selectedAttendee = useMemo(
    () => results.find((result) => result.registration_id === selectedResultId) ?? null,
    [results, selectedResultId],
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

  useWizardStepScroll(activeStep, [searchStepRef, selectStepRef, confirmStepRef]);

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
    setSuggestedSlotNowMs(null);
  }

  const handleBackToLookup = useCallback(() => {
    setSubmittedSearchToken('');
    setSelectedRegistrationId(null);
    setConfirmedRegistrationId(null);
    setCheckInResult(null);
    setSuggestedSlotNowMs(null);
  }, []);

  function handleReadyForNext() {
    handleClearSearch();
  }

  function handleBackToMatches() {
    setConfirmedRegistrationId(null);
    setCheckInResult(null);
    setSuggestedSlotNowMs(null);
  }

  function handleConfirmSelection() {
    if (!selectedResultId) {
      return;
    }

    setConfirmedRegistrationId(selectedResultId);
    setCheckInResult(null);
    setSuggestedSlotNowMs(Date.now());
  }

  async function submitCheckIn(slotOverride?: string) {
    if (!eventId || !confirmedAttendee) return;

    const finalSlot = slotOverride?.trim() ?? '';

    if (timeslotEnabled && timeslots.length > 0 && !finalSlot) {
      toast.error('Timeslot selection is required for this event.');
      return;
    }

    try {
      const result = await checkInMutation.mutateAsync({
        event_id: eventId,
        attendee_kind: confirmedAttendee.attendee_kind,
        registration_id:
          confirmedAttendee.attendee_kind === 'registered'
            ? confirmedAttendee.registration_id
            : undefined,
        public_registration_id:
          confirmedAttendee.attendee_kind === 'public'
            ? (confirmedAttendee.public_registration_id ?? confirmedAttendee.registration_id)
            : undefined,
        slot: timeslotEnabled ? finalSlot || undefined : undefined,
      });

      setCheckInResult(result);

      if (result.status === 'checked_in') {
        toast.success('Attendee checked in successfully.');
        setTimeout(() => {
          handleReadyForNext();
        }, TIMING.registrationWizardStepThreeTimeoutMs);
      } else if (result.status === 'already_checked_in') {
        toast.info('Attendee was already checked in.');
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to check in attendee.';
      toast.error(message);
    }
  }

  function handleCheckIn() {
    void submitCheckIn();
  }

  async function handleReopenRegistration() {
    if (!eventId || !event) {
      return;
    }

    const eventEndMs = event.ends_at ? Date.parse(event.ends_at) : Number.NaN;
    const hasFutureEventEnd = Number.isFinite(eventEndMs) && eventEndMs > Date.now();
    const reopenCloseValue = hasFutureEventEnd ? toDatetimeLocal(event.ends_at) : '';

    try {
      await updateEventMutation.mutateAsync({
        id: eventId,
        title: event.title,
        description: event.description ?? '',
        location: event.location ?? '',
        starts_at: toDatetimeLocal(event.starts_at),
        ends_at: toDatetimeLocal(event.ends_at),
        registration_opens_at: '',
        registration_closes_at: reopenCloseValue,
        status: event.status,
        duplicate_policy: event.duplicate_policy,
        registration_mode: 'open',
        allow_public_registrations: event.allow_public_registrations,
        allow_name_lookup: Boolean(event.metadata?.allow_name_lookup),
      });
      toast.success(
        'Registration reopened for event day. Ask attendee to complete registration, then retry lookup.',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reopen registration.';
      toast.error(message);
    }
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
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event.title, to: toAdminEventDetail(eventId) },
          { label: 'Attendance', to: toAdminEventAttendance(eventId) },
          { label: 'Check-In' },
        ]}
        navLinks={<EventNavigationLinks eventId={eventId} currentSection="attendance-check-in" />}
        title="Manage Check-In"
        description="Scan RFID or search attendee by name or email, confirm check-in, then continue to the next person."
      />

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
        }}
      />

      {!attendanceEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Attendance tracking is disabled</p>
          <p className="mt-1 text-xs text-amber-700">
            Enable attendance tracking in{' '}
            <ActionLink to={toAdminEventAttendance(eventId)}>Attendance Settings</ActionLink> to use
            check-in.
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

      {showCheckInWizard && (
        <StepIndicator
          currentStep={activeStep}
          totalSteps={3}
          labels={['Lookup', 'Select', 'Confirm']}
        />
      )}

      <AdminPageShell.Content>
        {showCheckInWizard && activeStep === 1 && (
          <div ref={searchStepRef} className="space-y-4 scroll-mt-24">
            <AttendeeSearchStep
              searchToken={searchToken}
              submittedSearchToken={submittedSearchToken}
              isSearching={searchQuery.isFetching}
              disabled={!attendanceEnabled || isCheckInBlockedByWindow}
              results={results}
              isSearchError={searchQuery.isError}
              onSearchTokenChange={setSearchToken}
              onSubmit={handleSubmitSearch}
              notFoundActions={
                <div className="flex flex-wrap gap-2">
                  {registrationOpen ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (event) {
                          window.open(
                            toEventRegistration(event.slug),
                            '_blank',
                            'noopener,noreferrer',
                          );
                        }
                      }}
                    >
                      Open Registration Page
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleReopenRegistration}
                      disabled={updateEventMutation.isPending}
                    >
                      {updateEventMutation.isPending
                        ? 'Reopening Registration...'
                        : 'Reopen Registration (Admin)'}
                    </Button>
                  )}
                </div>
              }
            />
          </div>
        )}

        {showCheckInWizard && activeStep === 2 && (
          <div ref={selectStepRef} className="space-y-4 scroll-mt-24">
            <AttendeeSelectStep
              results={results}
              selectedResultId={selectedResultId}
              selectedAttendee={selectedAttendee}
              searchError={searchQuery.error}
              onSelect={(registrationId) => {
                setSelectedRegistrationId(registrationId);
                setConfirmedRegistrationId(null);
                setCheckInResult(null);
              }}
              onConfirmSelection={handleConfirmSelection}
              inactivityTimeoutMs={TIMING.registrationWizardConfirmTimeoutMs}
              onInactivityTimeout={handleBackToLookup}
            />

            <Button type="button" size="lg" variant="outline" onClick={handleBackToLookup}>
              Back to Lookup
            </Button>
          </div>
        )}

        {showCheckInWizard && activeStep === 3 && (
          <div ref={confirmStepRef} className="space-y-4 scroll-mt-24">
            <AttendeeConfirmStep
              attendee={confirmedAttendee}
              checkInResult={checkInResult}
              isSubmitting={checkInMutation.isPending}
              timeslotEnabled={timeslotEnabled}
              timeslots={timeslots}
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
              <Button type="button" variant="outline" onClick={handleBackToMatches}>
                Back to Matches
              </Button>
              <Button type="button" variant="outline" onClick={handleBackToLookup}>
                Start New Lookup
              </Button>
            </div>
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
