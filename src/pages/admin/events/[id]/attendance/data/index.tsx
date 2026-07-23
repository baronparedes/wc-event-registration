import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';

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
  useAttendanceSavedViewQuery,
  useAttendanceSettingsQuery,
  useAttendanceViewControlsState,
  useAttendeesLocalCacheQuery,
} from '@/hooks/domain/attendance';
import { useAttendanceFieldsQuery } from '@/hooks/domain/attendance-fields';
import {
  canExportAdminReports,
  canManageAttendanceSavedViews,
  useAdminAuthQuery,
} from '@/hooks/domain/auth';
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useLocalStorage } from '@/hooks/utils';
import { buildAttendeeView, collectDynamicFieldOptions } from '@/lib/domain/attendance-views';
import { canWriteAdminData } from '@/lib/domain/auth';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import {
  AttendanceDataEntryList,
  AttendanceViewControls,
  ExportAttendanceViewButton,
  SavedViewsModal,
} from './components';

const SELECTED_VIEW_STORAGE_PREFIX = 'wc:attendance-data:selected-view';

function getSelectedViewStorageKey(eventId: string): string {
  return `${SELECTED_VIEW_STORAGE_PREFIX}:${eventId}`;
}

export function AdminAttendanceDataPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: authState } = useAdminAuthQuery();
  const [searchParams] = useSearchParams();
  const [savedViewsModalOpen, setSavedViewsModalOpen] = useState(false);
  const appliedViewIdRef = useRef<string | null>(null);
  const persistedViewIdRef = useRef<string | null>(null);
  const selectedViewStorage = useLocalStorage<string>(id ? getSelectedViewStorageKey(id) : null, {
    parse: (raw) => raw,
    stringify: (value) => value,
  });

  const viewIdParam = searchParams.get('viewId');
  const { data: savedView } = useAttendanceSavedViewQuery(viewIdParam ?? undefined);

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
  const memberDynamicFieldOptions = useMemo(
    () => [
      {
        source: 'member' as const,
        fieldKey: 'member_id',
        label: 'RFID',
        sortOrder: 0,
        token: 'member:member_id',
        values: [
          ...new Set(
            cachedAttendees
              .map((attendee) => attendee.member_id?.trim())
              .filter((value): value is string => Boolean(value)),
          ),
        ].sort((a, b) => a.localeCompare(b)),
      },
      {
        source: 'role' as const,
        fieldKey: 'role',
        label: 'Role',
        sortOrder: 1,
        token: 'role:role',
        values: [
          ...new Set(
            cachedAttendees
              .map((attendee) => attendee.role?.trim())
              .filter((value): value is string => Boolean(value)),
          ),
        ].sort((a, b) => a.localeCompare(b)),
      },
      {
        source: 'category' as const,
        fieldKey: 'category',
        label: 'Category',
        sortOrder: 2,
        token: 'category:category',
        values: [
          ...new Set(
            cachedAttendees
              .map((attendee) => attendee.category?.trim())
              .filter((value): value is string => Boolean(value)),
          ),
        ].sort((a, b) => a.localeCompare(b)),
      },
      {
        source: 'member' as const,
        fieldKey: 'email',
        label: 'Email',
        sortOrder: 3,
        token: 'member:email',
        values: [
          ...new Set(
            cachedAttendees
              .map((attendee) => attendee.email?.trim())
              .filter((value): value is string => Boolean(value)),
          ),
        ].sort((a, b) => a.localeCompare(b)),
      },
      {
        source: 'member' as const,
        fieldKey: 'avatar',
        label: 'Avatar',
        sortOrder: 4,
        token: 'member:avatar',
        values: [],
      },
    ],
    [cachedAttendees],
  );
  const seededDynamicFields = useMemo(
    () => [
      ...registrationFields
        .filter((field) => field.is_active)
        .map((field) => ({
          source: 'registration' as const,
          fieldKey: field.field_key,
          label: field.label,
          sortOrder: field.display_order,
          fieldType: field.field_type,
        })),
      ...fields.map((field) => ({
        source: 'attendance' as const,
        fieldKey: field.field_key,
        label: field.label,
        sortOrder: field.display_order,
        fieldType: field.field_type,
      })),
      ...memberDynamicFieldOptions.map((field) => ({
        source: field.source,
        fieldKey: field.fieldKey,
        label: field.label,
        sortOrder: field.sortOrder,
      })),
    ],
    [registrationFields, fields, memberDynamicFieldOptions],
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

  // Auto-apply saved view only once when viewId param changes
  useEffect(() => {
    if (
      viewIdParam &&
      appliedViewIdRef.current !== viewIdParam &&
      savedView &&
      savedView.view_config
    ) {
      applyViewConfig(savedView.view_config);
      appliedViewIdRef.current = viewIdParam;
    }
  }, [viewIdParam, savedView, applyViewConfig]);

  // Persist the selected saved view ID locally and restore it when the URL is empty.
  useEffect(() => {
    if (!id) {
      return;
    }

    if (viewIdParam) {
      if (persistedViewIdRef.current !== viewIdParam) {
        selectedViewStorage.set(viewIdParam);
        persistedViewIdRef.current = viewIdParam;
      }
      return;
    }

    persistedViewIdRef.current = null;

    const storedViewId = selectedViewStorage.get()?.trim() || null;
    if (!storedViewId) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set('viewId', storedViewId);

    navigate(
      {
        search: `?${params.toString()}`,
      },
      { replace: true },
    );
  }, [id, navigate, searchParams, selectedViewStorage, viewIdParam]);

  // Handle clearing the current saved view
  const handleClearView = useCallback(() => {
    clearViewControls();
    appliedViewIdRef.current = null;
    if (id) {
      selectedViewStorage.remove();
    }

    const params = new URLSearchParams(searchParams);
    params.delete('viewId');
    navigate(
      {
        search: params.toString() ? `?${params.toString()}` : '',
      },
      { replace: true },
    );
  }, [clearViewControls, id, navigate, searchParams, selectedViewStorage]);

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
  const canWrite = canWriteAdminData(authState?.adminRole);
  const canManageViews = canManageAttendanceSavedViews(authState?.adminRole);
  const canExport = canExportAdminReports(authState?.adminRole);

  const canRunBulkOps = Boolean(id) && attendanceEnabled && fields.length > 0;

  const actions = (
    <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end print:hidden">
      {id && (canManageViews || canExport || canWrite) && (
        <>
          {canManageViews && (
            <Button variant="outline" onClick={() => setSavedViewsModalOpen(true)}>
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
          {canWrite && canRunBulkOps && (
            <Button asChild variant="outline">
              <Link to={toAdminEventAttendanceDataBulkUpload(id)}>Upload CSV</Link>
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
            {id && canWrite ? (
              <ActionLink to={toAdminEventAttendance(id)}>Attendance Settings</ActionLink>
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
        <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-muted print:hidden">
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
          hasActiveFilters={hasActiveFilters}
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
          onClearViewControls={clearViewControls}
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
            canWrite={canWrite}
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
          onApplyView={applyViewConfig}
          canUpdate={canWrite}
          canDelete={canWrite}
          onViewDeleted={() => {
            if (id) {
              selectedViewStorage.remove();
            }
            appliedViewIdRef.current = null;
            clearViewControls();
          }}
        />
      )}
    </AdminPageShell>
  );
}
