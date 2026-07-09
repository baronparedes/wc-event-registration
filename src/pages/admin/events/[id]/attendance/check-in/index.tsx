import { useCallback, useMemo, useRef, useState } from 'react';

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
} from '@/config/constants';
import { useCheckInAttendeeMutation } from '@/hooks/domain/attendance/mutations';
import {
  useAttendanceSettingsQuery,
  useSearchAttendeesQuery,
} from '@/hooks/domain/attendance/queries';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useAdminRegistrationsQuery } from '@/hooks/domain/registrations';
import { useWizardStepScroll } from '@/hooks/utils';
import type { CheckInResult } from '@/lib/domain/attendance';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { AttendeeConfirmStep, AttendeeSearchStep, AttendeeSelectStep } from './components';

export function AdminAttendanceCheckInPage() {
  const { id: eventId } = useParams<{ id: string }>();

  const [searchToken, setSearchToken] = useState('');
  const [submittedSearchToken, setSubmittedSearchToken] = useState('');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [confirmedRegistrationId, setConfirmedRegistrationId] = useState<string | null>(null);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);

  const searchStepRef = useRef<HTMLDivElement | null>(null);
  const selectStepRef = useRef<HTMLDivElement | null>(null);
  const confirmStepRef = useRef<HTMLDivElement | null>(null);

  const { data: event, isLoading: eventLoading } = useAdminEventQuery(eventId);
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettingsQuery(eventId);
  const registrationsQuery = useAdminRegistrationsQuery(eventId ?? '', { pageSize: 1 });
  const searchQuery = useSearchAttendeesQuery(eventId, submittedSearchToken);
  const checkInMutation = useCheckInAttendeeMutation();

  const isLoading = eventLoading || settingsLoading;
  const attendanceEnabled = settings?.attendance_enabled ?? false;
  const registeredCount = registrationsQuery.data?.totalCount ?? 0;

  const results = useMemo(() => searchQuery.data ?? [], [searchQuery.data]);
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

  function handleSubmitSearch() {
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

  function handleConfirmSelection() {
    if (!selectedResultId) {
      return;
    }

    setConfirmedRegistrationId(selectedResultId);
    setCheckInResult(null);
  }

  async function handleCheckIn() {
    if (!eventId || !confirmedAttendee) return;

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

      {attendanceEnabled && (
        <StepIndicator
          currentStep={activeStep}
          totalSteps={3}
          labels={['Lookup', 'Select', 'Confirm']}
        />
      )}

      <AdminPageShell.Content>
        {attendanceEnabled && activeStep === 1 && (
          <div ref={searchStepRef} className="space-y-4 scroll-mt-24">
            <AttendeeSearchStep
              searchToken={searchToken}
              submittedSearchToken={submittedSearchToken}
              isSearching={searchQuery.isFetching}
              disabled={!attendanceEnabled}
              results={results}
              isSearchError={searchQuery.isError}
              onSearchTokenChange={setSearchToken}
              onSubmit={handleSubmitSearch}
            />
          </div>
        )}

        {attendanceEnabled && activeStep === 2 && (
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

        {attendanceEnabled && activeStep === 3 && (
          <div ref={confirmStepRef} className="space-y-4 scroll-mt-24">
            <AttendeeConfirmStep
              attendee={confirmedAttendee}
              checkInResult={checkInResult}
              isSubmitting={checkInMutation.isPending}
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
