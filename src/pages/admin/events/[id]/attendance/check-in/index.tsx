import { useRef } from 'react';

import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Button, EventHeaderCard } from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { ROUTE_PATHS, TIMING, toRoute } from '@/config/constants';
import { formatDateTime } from '@/lib/infrastructure';

import { AttendeeCacheStatusBar } from '../components/AttendeeCacheStatusBar';
import { AttendeeConfirmStep, AttendeeSearchStep, AttendeeSelectStep } from './components';
import { useAdminCheckInPageState } from './hooks';

export function AdminAttendanceCheckInPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const searchStepRef = useRef<HTMLDivElement | null>(null);
  const selectStepRef = useRef<HTMLDivElement | null>(null);
  const confirmStepRef = useRef<HTMLDivElement | null>(null);
  const state = useAdminCheckInPageState(eventId, [searchStepRef, selectStepRef, confirmStepRef]);

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

  if (state.isLoading) {
    return (
      <AdminPageShell>
        <AdminPageShell.Content isLoading={true} loadingMessage="Loading check-in tools...">
          {null}
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (!state.event) {
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
          event: state.event,
          registration_count: state.registeredCount,
          reason: 'available',
        }}
      />

      {!state.attendanceEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Attendance tracking is disabled</p>
          <p className="mt-1 text-xs text-amber-700">
            {state.canWrite ? (
              <>
                Enable attendance tracking in{' '}
                <ActionLink to={toRoute('adminEventAttendance', { id: eventId })}>
                  Attendance Settings
                </ActionLink>{' '}
                to use check-in.
              </>
            ) : (
              'Attendance settings must be enabled by an admin before kiosk check-in can be used.'
            )}
          </p>
        </div>
      )}

      {state.isCheckInBlockedByWindow && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">
            Check-in is read-only outside the event date-time window.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Allowed window:{' '}
            {state.event
              ? `${formatDateTime(state.event.starts_at)} to ${formatDateTime(state.event.ends_at)}`
              : 'Unavailable'}
          </p>
        </div>
      )}

      {state.showCheckInWizard && state.isUsingCachedEventOrSettings && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Offline — using last synced data</p>
          <p className="mt-1 text-xs text-amber-700">
            Event and attendance settings are from the last time this device was online. Check-ins
            will queue and sync once connection returns.
          </p>
        </div>
      )}

      {state.showCheckInWizard && state.attendanceEnabled && (
        <AttendeeCacheStatusBar
          message={state.cacheStatusMessage}
          isError={state.isCacheError}
          isRefreshing={state.cacheFetching}
          disabled={!state.isOnline}
          onRefresh={state.handleRefreshCache}
        />
      )}

      {state.showCheckInWizard && state.showQueueStatusBanner && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">
            {state.pendingCheckInCount > 0
              ? `${state.pendingCheckInCount} check-in${state.pendingCheckInCount === 1 ? '' : 's'} queued for background sync.`
              : 'A queued check-in needs attention.'}
          </p>
          {state.lastQueueError && (
            <p className="mt-1 text-xs text-blue-700">Last sync issue: {state.lastQueueError}</p>
          )}
        </div>
      )}

      {state.showCheckInWizard && (
        <StepIndicator
          currentStep={state.activeStep}
          totalSteps={3}
          labels={['Lookup', 'Select', 'Confirm']}
        />
      )}

      <AdminPageShell.Content>
        {state.showCheckInWizard && state.activeStep === 1 && (
          <div ref={searchStepRef} className="space-y-2 scroll-mt-24">
            <AttendeeSearchStep
              searchToken={state.searchToken}
              submittedSearchToken={state.submittedSearchToken}
              isSearching={state.cacheFetching}
              disabled={!state.attendanceEnabled || state.cacheLoading}
              results={state.results}
              isSearchError={state.isCacheError}
              onSearchTokenChange={state.setSearchToken}
              onSubmit={state.handleSubmitSearch}
              notFoundActions={
                <div className="flex flex-wrap gap-2">
                  {!state.registrationOpen && (
                    <p className="text-sm text-muted">
                      Registration is closed. Ask an admin to reopen registration before check-in.
                    </p>
                  )}
                </div>
              }
            />
          </div>
        )}

        {state.showCheckInWizard && state.activeStep === 2 && (
          <div ref={selectStepRef} className="space-y-2 scroll-mt-24">
            <AttendeeSelectStep
              results={state.results}
              selectedResultId={state.selectedResultId}
              searchError={
                state.isCacheError && state.cacheError && state.cacheError instanceof Error
                  ? new Error('Failed to load attendee cache')
                  : state.cacheError || null
              }
              onSelect={(registrationId) => {
                state.setSelectedRegistrationId(registrationId);
                state.setConfirmedRegistrationId(null);
                state.setCheckInResult(null);
              }}
              onConfirmSelection={state.handleConfirmSelection}
              inactivityTimeoutMs={TIMING.registrationWizardConfirmTimeoutMs}
              onInactivityTimeout={state.handleBackToLookup}
            />

            <Button
              type="button"
              size="lg"
              variant="accent"
              onClick={state.handleBackToLookup}
              className="w-full"
            >
              Back to Lookup
            </Button>
          </div>
        )}

        {state.showCheckInWizard && state.activeStep === 3 && (
          <div ref={confirmStepRef} className="space-y-2 scroll-mt-24">
            <AttendeeConfirmStep
              attendee={state.confirmedAttendee}
              checkInResult={state.checkInResult}
              currentTimeMs={state.nowMs}
              isSubmitting={false}
              timeslotEnabled={state.timeslotEnabled}
              timeslots={state.timeslots}
              autoWindowModeEnabled={state.autoWindowModeEnabled}
              activeSlot={state.activeTimeslot?.slot_at ?? null}
              suggestedSlot={state.suggestedSlot}
              onTimeslotConfirm={(slot) => {
                void state.submitCheckIn(slot);
              }}
              onCheckIn={state.handleCheckIn}
              onReadyForNext={state.handleReadyForNext}
              inactivityTimeoutMs={TIMING.registrationWizardStepThreeTimeoutMs}
              onInactivityTimeout={state.handleBackToLookup}
              readOnly={state.isCheckInBlockedByWindow}
            />

            <div className="flex flex-wrap gap-2">
              {state.results.length > 1 && (
                <Button
                  type="button"
                  variant="primaryOutline"
                  onClick={state.handleBackToMatches}
                  className="w-full"
                >
                  Back to Matches
                </Button>
              )}
              {!(
                state.checkInResult ||
                (state.confirmedAttendee?.check_in_status === 'checked_in' &&
                  !(state.timeslotEnabled && state.timeslots.length > 0))
              ) && (
                <Button
                  type="button"
                  variant="accent"
                  onClick={state.handleBackToLookup}
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
