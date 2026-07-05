import { useCallback, useMemo, useRef, useState } from 'react';

import { Info } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { Badge, Button, CollapsibleSectionCard, SectionCard } from '@/components/ui';
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
import { useKioskInactivityReset, useRfidAutoFocus } from '@/hooks/utils';
import type { CheckInResult } from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { CheckInCard, ResultsList, SearchForm } from './components';

export function AdminAttendanceCheckInPage() {
  const { id: eventId } = useParams<{ id: string }>();

  const [searchToken, setSearchToken] = useState('');
  const [submittedSearchToken, setSubmittedSearchToken] = useState('');
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [confirmedRegistrationId, setConfirmedRegistrationId] = useState<string | null>(null);
  const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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

    if (submittedSearchToken.trim().length > 0) {
      return 2;
    }

    return 1;
  }, [confirmedAttendee, submittedSearchToken]);

  const isRfidCaptureActive = attendanceEnabled && activeStep === 1;

  useRfidAutoFocus(searchInputRef, isRfidCaptureActive);

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

  const { secondsRemaining: stepTwoSecondsRemaining } = useKioskInactivityReset(
    handleBackToLookup,
    TIMING.registrationWizardConfirmTimeoutMs,
    attendanceEnabled && activeStep === 2,
  );

  const { secondsRemaining: stepThreeSecondsRemaining } = useKioskInactivityReset(
    handleBackToLookup,
    TIMING.registrationWizardStepThreeTimeoutMs,
    attendanceEnabled && activeStep === 3,
  );

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

      <CollapsibleSectionCard
        title={event.title}
        subtitle={
          <Badge
            variant={
              event.status === 'published'
                ? 'open'
                : event.status === 'draft'
                  ? 'upcoming'
                  : 'closed'
            }
          >
            {event.status === 'published'
              ? 'Open'
              : event.status === 'draft'
                ? 'Draft'
                : 'Archived'}
          </Badge>
        }
        collapseLabel="Collapse event details"
        expandLabel="Expand event details"
      >
        {event.description && <p className="mt-3 text-sm text-muted">{event.description}</p>}

        <div className="mt-4 grid gap-2 rounded-lg border border-border bg-background/70 p-3 text-sm text-muted sm:grid-cols-2">
          {event.location && (
            <p className="sm:col-span-2">
              Location: <span className="font-medium text-text">{event.location}</span>
            </p>
          )}
          <p>
            Starts: <span className="font-medium text-text">{formatDateTime(event.starts_at)}</span>
          </p>
          <p>
            Ends: <span className="font-medium text-text">{formatDateTime(event.ends_at)}</span>
          </p>
          <p className="sm:col-span-2">
            Registered: <span className="font-medium text-text">{registeredCount}</span>
          </p>
        </div>

        <div className="mt-4 grid gap-2 rounded-lg border border-border bg-background/70 p-3 text-sm text-muted sm:grid-cols-2">
          <p>
            Registration opens:{' '}
            <span className="font-medium text-text">
              {formatDateTime(event.registration_opens_at)}
            </span>
          </p>
          <p>
            Registration closes:{' '}
            <span className="font-medium text-text">
              {formatDateTime(event.registration_closes_at)}
            </span>
          </p>
        </div>
      </CollapsibleSectionCard>

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
          <div className="space-y-4">
            <SearchForm
              inputRef={searchInputRef}
              searchToken={searchToken}
              isSearching={searchQuery.isFetching}
              disabled={!attendanceEnabled}
              onSearchTokenChange={setSearchToken}
              onSubmit={handleSubmitSearch}
            />

            <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-900">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-700" />
              <p>Start by scanning an RFID/member ID or enter a name/email, then tap Search.</p>
            </div>
          </div>
        )}

        {attendanceEnabled && activeStep === 2 && (
          <div className="space-y-4">
            <SectionCard
              title="Step 2: Select Matching Attendee"
              subtitle="Choose the correct attendee from the results before check-in."
              titleClassName="font-heading text-2xl font-semibold text-text"
              subtitleClassName="mt-2 text-lg text-muted"
            >
              <div className="space-y-4">
                {searchQuery.error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {searchQuery.error instanceof Error
                      ? searchQuery.error.message
                      : 'Failed to search attendees.'}
                  </div>
                )}

                <ResultsList
                  results={results}
                  selectedRegistrationId={selectedResultId}
                  onSelect={(registrationId) => {
                    setSelectedRegistrationId(registrationId);
                    setConfirmedRegistrationId(null);
                    setCheckInResult(null);
                  }}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    fullWidth={true}
                    size="lg"
                    onClick={handleConfirmSelection}
                    disabled={!selectedResultId}
                  >
                    {selectedAttendee ? (
                      <span className="flex flex-col items-center leading-tight">
                        <span>Confirm Selection</span>
                        <span>({selectedAttendee.full_name})</span>
                      </span>
                    ) : (
                      'Confirm Selection'
                    )}
                  </Button>
                </div>

                {stepTwoSecondsRemaining !== null && (
                  <p className="text-base text-muted">
                    Returning to Step 1 in {stepTwoSecondsRemaining}s if this step is not completed.
                  </p>
                )}
              </div>
            </SectionCard>

            <Button type="button" size="lg" variant="outline" onClick={handleBackToLookup}>
              Back to Lookup
            </Button>
          </div>
        )}

        {attendanceEnabled && activeStep === 3 && (
          <div className="space-y-4">
            <CheckInCard
              attendee={confirmedAttendee}
              checkInResult={checkInResult}
              isSubmitting={checkInMutation.isPending}
              inactivitySecondsRemaining={stepThreeSecondsRemaining}
              onCheckIn={handleCheckIn}
              onReadyForNext={handleReadyForNext}
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
