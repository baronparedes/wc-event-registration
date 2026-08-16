import { useCallback, useMemo, useState } from 'react';

import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { ActionLink } from '@/components/ui/ActionLink';
import { Button } from '@/components/ui/Button';
import { ROUTE_PATHS, toRoute } from '@/config/constants';
import {
  useAttendanceSavedViewQuery,
  useAttendanceSettingsQuery,
  useAttendanceViewControlsState,
  useAttendeesLocalCacheQuery,
  useOfflineAttendanceDataSnapshot,
} from '@/hooks/domain/attendance';
import { useAttendanceFieldsQuery } from '@/hooks/domain/attendance-fields';
import { canAdminPerform, useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { attendeeViewConfigSchema, buildAttendeeView } from '@/lib/domain/attendance-views';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { AttendeeCacheStatusBar } from '../components/AttendeeCacheStatusBar';
import {
  AttendanceDataEntryList,
  AttendanceViewControls,
  ExportAttendanceViewButton,
  SavedViewsModal,
} from './components';
import { useAttendanceDataViewOptions } from './hooks/useAttendanceDataViewOptions';
import { useSelectedAttendanceView } from './hooks/useSelectedAttendanceView';

export function AdminAttendanceDataPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: authState } = useAdminAuthQuery();
  const [searchParams] = useSearchParams();
  const [savedViewsModalOpen, setSavedViewsModalOpen] = useState(false);

  const viewIdParam = searchParams.get('viewId');
  const { data: savedView } = useAttendanceSavedViewQuery(viewIdParam ?? undefined);

  const { data: onlineEvent, isLoading: eventLoading } = useAdminEventQuery(id);
  const { data: onlineSettings, isLoading: settingsLoading } = useAttendanceSettingsQuery(id);
  const { data: onlineFields = [], isLoading: fieldsLoading } = useAttendanceFieldsQuery(id, {
    activeOnly: true,
  });
  const { data: onlineRegistrationFields = [], isLoading: registrationFieldsLoading } =
    useAdminEventFieldsQuery(id);
  const offlinePreparation = useMemo(() => {
    if (!authState?.isAuthenticated || !authState.session || !authState.adminRole) {
      return undefined;
    }

    if (!onlineEvent || !onlineSettings) {
      return undefined;
    }

    return {
      owner: {
        userId: authState.session.user.id,
        role: authState.adminRole,
      },
      event: onlineEvent,
      settings: onlineSettings,
    };
  }, [authState, onlineEvent, onlineSettings]);
  const {
    attendees: onlineAttendees,
    cachedAt,
    isLoading: attendeesLoading,
    isFetching: attendeesFetching,
    refresh,
    updateAttendanceAnswers,
  } = useAttendeesLocalCacheQuery(id, {
    offlinePreparation,
    attendanceDataSnapshot:
      onlineEvent && onlineSettings
        ? {
            event: onlineEvent,
            settings: onlineSettings,
            attendanceFields: onlineFields,
            registrationFields: onlineRegistrationFields,
          }
        : undefined,
  });

  const offlineSnapshot = useOfflineAttendanceDataSnapshot({
    eventId: id,
    event: onlineEvent,
    settings: onlineSettings,
    attendanceFields: onlineFields,
    registrationFields: onlineRegistrationFields,
    attendees: onlineAttendees,
  });

  const event = offlineSnapshot.event;
  const settings = offlineSnapshot.settings;
  const fields = useMemo(
    () => offlineSnapshot.attendanceFields ?? [],
    [offlineSnapshot.attendanceFields],
  );
  const registrationFields = useMemo(
    () => offlineSnapshot.registrationFields ?? [],
    [offlineSnapshot.registrationFields],
  );
  const attendees = offlineSnapshot.attendees;

  const cachedAttendees = useMemo(() => attendees ?? [], [attendees]);
  const {
    dynamicFieldOptions,
    registrationDynamicFieldOptions,
    attendanceDynamicFieldOptions,
    memberDynamicFieldOptions,
    roleOptions,
    categoryOptions,
  } = useAttendanceDataViewOptions({
    attendees: cachedAttendees,
    attendanceFields: fields,
    registrationFields,
  });

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
    setDynamicFilterCombination,
    setFilterFieldToken,
    setDynamicFilterValue,
    addDynamicFilter,
    applyCustomFilterJson,
    removeDynamicFilter,
    toggleVisibleField,
    clearViewControls,
    applyViewConfig,
    addGroupingLevel,
    changeGroupingField,
    changeGroupingSort,
    removeGroupingLevel,
    moveGroupingLevel,
  } = useAttendanceViewControlsState(dynamicFieldOptions);

  const { activeSavedViewConfig, handleApplyViewConfig, handleClearView, clearSelectedView } =
    useSelectedAttendanceView({
      eventId: id,
      viewIdParam,
      savedView,
      searchParams,
      navigate,
      applyViewConfig,
      clearViewControls,
    });

  const clearFiltersTargetConfig = useMemo(
    () =>
      activeSavedViewConfig ??
      (savedView?.view_config ? attendeeViewConfigSchema.parse(savedView.view_config) : null),
    [activeSavedViewConfig, savedView],
  );

  const handleClearFilters = useCallback(() => {
    if (clearFiltersTargetConfig) {
      applyViewConfig(clearFiltersTargetConfig);
      return;
    }

    clearViewControls();
  }, [applyViewConfig, clearFiltersTargetConfig, clearViewControls]);

  const canClearFilters = useMemo(() => {
    if (clearFiltersTargetConfig) {
      return JSON.stringify(viewConfig) !== JSON.stringify(clearFiltersTargetConfig);
    }

    return hasActiveFilters;
  }, [clearFiltersTargetConfig, hasActiveFilters, viewConfig]);

  const viewResult = useMemo(
    () => buildAttendeeView(cachedAttendees, viewConfig),
    [cachedAttendees, viewConfig],
  );

  const isUsingSnapshot = offlineSnapshot.isUsingSnapshot;
  const isLoading = isUsingSnapshot
    ? false
    : offlineSnapshot.isOnline
      ? eventLoading ||
        settingsLoading ||
        fieldsLoading ||
        registrationFieldsLoading ||
        attendeesLoading
      : offlineSnapshot.isLoadingSnapshot;

  const cacheStatusMessage = useMemo(() => {
    const displayedCachedAt = offlineSnapshot.snapshotCreatedAt ?? cachedAt;

    if (offlineSnapshot.isUsingSnapshot) {
      return `${cachedAttendees.length} attendees · Offline snapshot from ${new Date(
        displayedCachedAt ?? 0,
      ).toLocaleTimeString()}`;
    }

    if (attendeesFetching) {
      return 'Loading attendee details...';
    }

    return `${cachedAttendees.length} attendees cached${
      displayedCachedAt ? ` · Updated ${new Date(displayedCachedAt).toLocaleTimeString()}` : ''
    }`;
  }, [
    attendeesFetching,
    cachedAt,
    cachedAttendees.length,
    offlineSnapshot.isUsingSnapshot,
    offlineSnapshot.snapshotCreatedAt,
  ]);

  function handleRefreshCache() {
    refresh();
  }

  const attendanceEnabled = settings?.attendance_enabled ?? false;
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const canWriteOnline = canWrite && offlineSnapshot.isOnline && !isUsingSnapshot;
  const canManageViews = canAdminPerform(authState?.adminRole, 'canManageAttendanceSavedViews');
  const canExport = canAdminPerform(authState?.adminRole, 'canExportAdminReports');

  const canRunBulkOps = Boolean(id) && attendanceEnabled && fields.length > 0;

  const actions = (
    <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end print:hidden">
      {id && (canManageViews || canExport || canWrite || offlineSnapshot.isOnline) && (
        <>
          {canManageViews && (
            <Button variant="primaryOutline" onClick={() => setSavedViewsModalOpen(true)}>
              Views
            </Button>
          )}
          {canExport && (
            <ExportAttendanceViewButton
              eventId={id}
              attendanceEnabled={attendanceEnabled}
              filteredAttendees={viewResult.filteredAttendees}
              groups={viewResult.groups}
              visibleFields={viewConfig.visibleFields}
            />
          )}
          {canWriteOnline && canRunBulkOps && (
            <Button asChild variant="primaryOutline">
              <Link to={toRoute('adminAttendanceDataBulkUpload', { id })}>Upload CSV</Link>
            </Button>
          )}
        </>
      )}
    </div>
  );

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          {
            label: event?.title ?? 'Event',
            to: id ? toRoute('adminEventDetail', { id }) : undefined,
          },
          { label: 'Attendance', to: id ? toRoute('adminEventAttendance', { id }) : undefined },
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
            {id && canWrite ? (
              <ActionLink to={toRoute('adminEventAttendance', { id })}>
                Attendance Settings
              </ActionLink>
            ) : (
              'Attendance Settings'
            )}{' '}
            to collect attendance data.
          </p>
        </div>
      )}

      {!isLoading && attendanceEnabled && fields.length === 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 print:hidden">
          <p className="text-sm font-medium text-blue-800">No attendance fields configured</p>
          <p className="mt-1 text-xs text-blue-700">
            {id && canWrite ? (
              <>
                <ActionLink to={toRoute('adminAttendanceFields', { id })}>
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
        <AttendeeCacheStatusBar
          message={cacheStatusMessage}
          isError={Boolean(offlineSnapshot.error)}
          isRefreshing={attendeesFetching}
          onRefresh={handleRefreshCache}
          className="print:hidden"
        />
      )}

      {!isLoading && attendanceEnabled && (!offlineSnapshot.isOnline || isUsingSnapshot) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 print:hidden">
          <p className="text-sm font-medium text-amber-800">Offline snapshot view</p>
          <p className="mt-1 text-xs text-amber-700">
            Attendance details are read-only until live data returns.{' '}
            {offlineSnapshot.isSnapshotAvailable
              ? `Last snapshot: ${new Date(offlineSnapshot.snapshotCreatedAt ?? 0).toLocaleString()}. This snapshot may be up to 24 hours old.`
              : 'Reconnect and prepare this event for offline viewing first.'}
          </p>
        </div>
      )}

      {!isLoading && attendanceEnabled && viewIdParam && savedView && (
        <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm print:hidden">
          <div>
            <p className="text-muted">Viewing saved filter:</p>
            <p className="font-semibold text-text">{savedView.name}</p>
          </div>
          <button
            type="button"
            onClick={handleClearView}
            className="rounded px-3 py-1 text-xs text-primary underline hover:no-underline"
          >
            Clear
          </button>
        </div>
      )}

      {!isLoading && attendanceEnabled && (
        <AttendanceViewControls
          viewConfig={viewConfig}
          canClearFilters={canClearFilters}
          roleOptions={roleOptions}
          categoryOptions={categoryOptions}
          dynamicFieldOptions={dynamicFieldOptions}
          registrationDynamicFieldOptions={registrationDynamicFieldOptions}
          attendanceDynamicFieldOptions={attendanceDynamicFieldOptions}
          memberDynamicFieldOptions={memberDynamicFieldOptions}
          dynamicFilterFieldToken={dynamicFilterFieldToken}
          dynamicFilterValue={dynamicFilterValue}
          dynamicFilterCombination={viewConfig.dynamicFilterCombination ?? 'and'}
          dynamicFilterFieldLabel={dynamicFilterField?.label ?? null}
          dynamicFilterFieldType={dynamicFilterField?.fieldType ?? null}
          onNameOrMemberQueryChange={setNameOrMemberQuery}
          onRoleChange={setRole}
          onCategoryChange={setCategory}
          onCheckInStatusChange={setCheckInStatus}
          onAddGroupingLevel={addGroupingLevel}
          onGroupingFieldChange={changeGroupingField}
          onGroupingSortChange={changeGroupingSort}
          onMoveGroupingLevel={moveGroupingLevel}
          onRemoveGroupingLevel={removeGroupingLevel}
          onClearViewControls={handleClearFilters}
          onDynamicFilterFieldTokenChange={setFilterFieldToken}
          onDynamicFilterValueChange={setDynamicFilterValue}
          onDynamicFilterCombinationChange={setDynamicFilterCombination}
          onApplyDynamicFilter={addDynamicFilter}
          onApplyCustomFilterJson={applyCustomFilterJson}
          onRemoveDynamicFilter={removeDynamicFilter}
          onToggleVisibleField={toggleVisibleField}
        />
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
            allAttendees={viewResult.filteredAttendees}
            registrationFields={registrationFields}
            visibleFields={viewConfig.visibleFields}
            canWrite={canWriteOnline}
            fetchImage={offlineSnapshot.isOnline}
            onRegistrantAttendanceSaved={updateAttendanceAnswers}
          />
        )}
      </AdminPageShell.Content>

      {canManageViews && (
        <SavedViewsModal
          isOpen={savedViewsModalOpen}
          onOpenChange={setSavedViewsModalOpen}
          eventId={id ?? ''}
          currentViewConfig={viewConfig}
          currentViewId={viewIdParam}
          onApplyView={handleApplyViewConfig}
          canUpdate={canWriteOnline}
          canDelete={canWriteOnline}
          onViewDeleted={() => {
            clearSelectedView();
          }}
        />
      )}
    </AdminPageShell>
  );
}
