import { useMemo } from 'react';

import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { ActionLink } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import {
  ROUTE_PATHS,
  toAdminEventAttendance,
  toAdminEventAttendanceDataBulkUpload,
  toAdminEventAttendanceFields,
  toAdminEventDetail,
} from '@/config/constants';
import {
  useAttendanceSettingsQuery,
  useAttendanceViewControlsState,
  useAttendeesLocalCacheQuery,
} from '@/hooks/domain/attendance';
import { useAttendanceFieldsQuery } from '@/hooks/domain/attendance-fields';
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { buildAttendeeView, collectDynamicFieldOptions } from '@/lib/domain/attendance-views';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { AttendanceDataEntryList, AttendanceViewControls } from './components';

export function AdminAttendanceDataPage() {
  const { id } = useParams<{ id: string }>();

  const { data: event, isLoading: eventLoading } = useAdminEventQuery(id);
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettingsQuery(id);
  const { data: fields = [], isLoading: fieldsLoading } = useAttendanceFieldsQuery(id, {
    activeOnly: true,
  });
  const { data: registrationFields = [], isLoading: registrationFieldsLoading } =
    useAdminEventFieldsQuery(id);
  const {
    attendees,
    cachedAt,
    isLoading: attendeesLoading,
    isFetching: attendeesFetching,
    refresh,
  } = useAttendeesLocalCacheQuery(id);

  const cachedAttendees = useMemo(() => attendees ?? [], [attendees]);
  const seededDynamicFields = useMemo(
    () => [
      ...registrationFields
        .filter((field) => field.is_active)
        .map((field) => ({
          source: 'registration' as const,
          fieldKey: field.field_key,
          label: field.label,
          sortOrder: field.display_order,
        })),
      ...fields.map((field) => ({
        source: 'attendance' as const,
        fieldKey: field.field_key,
        label: field.label,
        sortOrder: field.display_order,
      })),
    ],
    [registrationFields, fields],
  );

  const dynamicFieldOptions = useMemo(
    () => collectDynamicFieldOptions(cachedAttendees, seededDynamicFields),
    [cachedAttendees, seededDynamicFields],
  );

  const registrationDynamicFieldOptions = useMemo(
    () => dynamicFieldOptions.filter((field) => field.source === 'registration'),
    [dynamicFieldOptions],
  );

  const attendanceDynamicFieldOptions = useMemo(
    () => dynamicFieldOptions.filter((field) => field.source === 'attendance'),
    [dynamicFieldOptions],
  );

  const roleOptions = useMemo(
    () =>
      [
        ...new Set(cachedAttendees.map((attendee) => attendee.role).filter(Boolean) as string[]),
      ].sort((a, b) => a.localeCompare(b)),
    [cachedAttendees],
  );

  const categoryOptions = useMemo(
    () =>
      [
        ...new Set(
          cachedAttendees.map((attendee) => attendee.category).filter(Boolean) as string[],
        ),
      ].sort((a, b) => a.localeCompare(b)),
    [cachedAttendees],
  );

  const {
    viewConfig,
    dynamicFilterField,
    dynamicFilterFieldToken,
    dynamicFilterValue,
    hasActiveFilters,
    setNameOrMemberQuery,
    setRole,
    setCategory,
    setCheckInStatus,
    setFilterFieldToken,
    setDynamicFilterValue,
    addDynamicFilter,
    removeDynamicFilter,
    clearViewControls,
    addGroupingLevel,
    changeGroupingField,
    removeGroupingLevel,
    moveGroupingLevel,
  } = useAttendanceViewControlsState(dynamicFieldOptions);

  const viewResult = useMemo(
    () => buildAttendeeView(cachedAttendees, viewConfig),
    [cachedAttendees, viewConfig],
  );

  const isLoading =
    eventLoading ||
    settingsLoading ||
    fieldsLoading ||
    registrationFieldsLoading ||
    attendeesLoading;

  function handleRefreshCache() {
    refresh();
  }

  const attendanceEnabled = settings?.attendance_enabled ?? false;

  const canRunBulkOps = Boolean(id) && attendanceEnabled && fields.length > 0;

  const actions = canRunBulkOps ? (
    <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end">
      {id && (
        <Button asChild variant="outline">
          <Link to={toAdminEventAttendanceDataBulkUpload(id)}>Upload CSV</Link>
        </Button>
      )}
    </div>
  ) : undefined;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event?.title ?? 'Event', to: id ? toAdminEventDetail(id) : undefined },
          { label: 'Attendance', to: id ? toAdminEventAttendance(id) : undefined },
          { label: 'Attendee Details' },
        ]}
        navLinks={
          id ? <EventNavigationLinks eventId={id} currentSection="attendance-data" /> : undefined
        }
        title="Manage Attendee Details"
        description={
          event
            ? `Fill in pre-event details for registered attendees of ${event.title}`
            : 'Fill in pre-event details for registered attendees'
        }
        actions={actions}
      />

      {!isLoading && !attendanceEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-medium text-amber-800">Attendance tracking is disabled</p>
          <p className="mt-1 text-xs text-amber-700">
            Enable attendance tracking in{' '}
            {id ? (
              <ActionLink to={toAdminEventAttendance(id)}>Attendance Settings</ActionLink>
            ) : (
              'Attendance Settings'
            )}{' '}
            to collect attendance data.
          </p>
        </div>
      )}

      {!isLoading && attendanceEnabled && fields.length === 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">No attendance fields configured</p>
          <p className="mt-1 text-xs text-blue-700">
            {id ? (
              <>
                <ActionLink to={toAdminEventAttendanceFields(id)}>
                  Configure attendance fields
                </ActionLink>{' '}
                first to start collecting data.
              </>
            ) : (
              'Configure attendance fields first to start collecting data.'
            )}
          </p>
        </div>
      )}

      {!isLoading && attendanceEnabled && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-muted">
          {attendeesFetching ? (
            <span>Loading attendee details...</span>
          ) : (
            <span>
              {cachedAttendees.length} attendees cached
              {cachedAt ? ` · Updated ${new Date(cachedAt).toLocaleTimeString()}` : ''}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefreshCache}
            disabled={attendeesFetching}
            className="ml-4 rounded px-2 py-1 text-primary underline hover:no-underline disabled:opacity-50"
          >
            {attendeesFetching ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      )}

      {!isLoading && attendanceEnabled && (
        <AdminPageShell.Filters>
          <AttendanceViewControls
            viewConfig={viewConfig}
            hasActiveFilters={hasActiveFilters}
            roleOptions={roleOptions}
            categoryOptions={categoryOptions}
            dynamicFieldOptions={dynamicFieldOptions}
            registrationDynamicFieldOptions={registrationDynamicFieldOptions}
            attendanceDynamicFieldOptions={attendanceDynamicFieldOptions}
            dynamicFilterFieldToken={dynamicFilterFieldToken}
            dynamicFilterValue={dynamicFilterValue}
            dynamicFilterFieldLabel={dynamicFilterField?.label ?? null}
            onNameOrMemberQueryChange={setNameOrMemberQuery}
            onRoleChange={setRole}
            onCategoryChange={setCategory}
            onCheckInStatusChange={setCheckInStatus}
            onAddGroupingLevel={addGroupingLevel}
            onGroupingFieldChange={changeGroupingField}
            onMoveGroupingLevel={moveGroupingLevel}
            onRemoveGroupingLevel={removeGroupingLevel}
            onClearViewControls={clearViewControls}
            onDynamicFilterFieldTokenChange={setFilterFieldToken}
            onDynamicFilterValueChange={setDynamicFilterValue}
            onApplyDynamicFilter={addDynamicFilter}
            onRemoveDynamicFilter={removeDynamicFilter}
          />
        </AdminPageShell.Filters>
      )}

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading attendance data...">
        {!event ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Event not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminEvents}>
              Back to events
            </Link>
          </div>
        ) : (
          <AttendanceDataEntryList
            eventId={id ?? ''}
            registrants={viewResult.groups.length === 1 ? viewResult.groups[0].registrants : []}
            groups={viewResult.groups}
            fields={fields}
          />
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
