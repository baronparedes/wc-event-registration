import { useNavigate, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Button, SectionCard } from '@/components/ui';
import { ROUTE_PATHS, toAdminEventAttendanceFields, toAdminEventDetail } from '@/config/constants';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { AttendanceTimeslotEditor } from './components/AttendanceTimeslotEditor';
import { useAdminEventAttendancePageState } from './hooks';

export function AdminEventAttendancePage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    attendanceEnabled,
    canWrite,
    effectiveTimeslots,
    errors,
    event,
    eventEndLocal,
    eventStartLocal,
    handleSubmit,
    isArchived,
    isAuthLoading,
    isDirty,
    isEventLoading,
    isSettingsLoading,
    register,
    settingsError,
    submitAttendanceSettings,
    timeslotEnabled,
    updateMutation,
    addTimeslot,
    removeTimeslot,
    updateTimeslotField,
  } = useAdminEventAttendancePageState(eventId);

  if (!eventId) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Attendance" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Invalid event ID.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const resolvedEventId = eventId ?? '';

  if (isAuthLoading || isEventLoading || isSettingsLoading) {
    return (
      <AdminPageShell>
        <AdminPageShell.Content isLoading={true} loadingMessage="Loading attendance settings...">
          {null}
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (!event) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Attendance" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Event not found.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (settingsError) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Attendance" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Failed to load attendance settings.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const activeEvent = event;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: activeEvent.title, to: toAdminEventDetail(resolvedEventId) },
          { label: 'Attendance' },
        ]}
        navLinks={<EventNavigationLinks eventId={resolvedEventId} currentSection="attendance" />}
        title="Manage Attendance"
        description="Configure event-day attendance tracking and timeslot attendance behavior."
      />

      {isArchived && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Archived event</p>
          <p className="mt-1 text-xs text-amber-700">
            Attendance settings are read-only for archived events.
          </p>
        </div>
      )}

      <AdminPageShell.Content>
        <form className="space-y-6" onSubmit={handleSubmit(submitAttendanceSettings)}>
          <SectionCard title="Attendance Controls">
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={isArchived}
                    {...register('attendance_enabled')}
                    className="h-4 w-4 cursor-pointer rounded border-border"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-text">
                      Enable attendance tracking
                    </span>
                    <span className="text-xs text-muted">
                      Allows check-in operations and attendance export for this event.
                    </span>
                  </div>
                </label>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={isArchived || !attendanceEnabled}
                    {...register('timeslot_enabled')}
                    className="h-4 w-4 cursor-pointer rounded border-border"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-text">
                      Enable timeslot attendance
                    </span>
                    <span className="text-xs text-muted">
                      Records attendance by configured slots (for example: 9AM, 12NN, 3PM).
                    </span>
                  </div>
                </label>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    disabled={isArchived || !attendanceEnabled}
                    {...register('enforce_check_in_event_window')}
                    className="h-4 w-4 cursor-pointer rounded border-border"
                  />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-text">
                      Restrict check-ins to event date-time window
                    </span>
                    <span className="text-xs text-muted">
                      When enabled, check-ins are only allowed between event start and end. Disable
                      for test scenarios.
                    </span>
                  </div>
                </label>
              </div>

              {timeslotEnabled && attendanceEnabled && (
                <AttendanceTimeslotEditor
                  eventStartsAt={activeEvent.starts_at}
                  eventEndsAt={activeEvent.ends_at}
                  eventStartLocal={eventStartLocal}
                  eventEndLocal={eventEndLocal}
                  errors={{ timeslots: errors.timeslots }}
                  isArchived={isArchived}
                  timeslots={effectiveTimeslots}
                  onAddTimeslot={addTimeslot}
                  onRemoveTimeslot={removeTimeslot}
                  onUpdateTimeslotField={updateTimeslotField}
                />
              )}
            </div>
          </SectionCard>

          {canWrite && (
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(toAdminEventAttendanceFields(resolvedEventId))}
              >
                Manage Attendance Fields
              </Button>
              <Button
                type="submit"
                size="lg"
                disabled={isArchived || updateMutation.isPending || !isDirty}
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Attendance Settings'}
              </Button>
            </div>
          )}
        </form>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
