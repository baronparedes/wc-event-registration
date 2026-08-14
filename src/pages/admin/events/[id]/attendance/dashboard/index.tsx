import { useCallback, useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { ROUTE_PATHS, toAdminEventAttendance, toAdminEventDetail } from '@/config/constants';
import { useAttendanceFieldsQuery } from '@/hooks/domain/attendance-fields';
import {
  useAttendanceSettingsQuery,
  useAttendeesLocalCacheQuery,
} from '@/hooks/domain/attendance/queries';
import { useAdminEventFieldsQuery } from '@/hooks/domain/event-fields';
import { useAdminEventQuery } from '@/hooks/domain/events';
import type { AttendeeSearchResult } from '@/lib/domain/attendance';
import type { AttendanceField } from '@/lib/domain/attendance-fields';
import {
  type DynamicFieldRef,
  collectDynamicFieldOptions,
  fromDynamicFieldToken,
  toDynamicFieldToken,
} from '@/lib/domain/attendance-views';
import type { AdminEventField } from '@/lib/domain/event-fields';
import { formatDateTime } from '@/lib/infrastructure';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { SectionCard } from '../../../../../../components/ui';
import { AttendeeCacheStatusBar } from '../components/AttendeeCacheStatusBar';
import { AttendancePrimaryFilters } from '../data/components/AttendancePrimaryFilters';
import { AllCheckInsTable } from './components/AllCheckInsTable';
import { type SlotCheckInRow, SlotTabPanel } from './components/SlotTabPanel';

const ALL_TAB = '__all__';

type SlotSummary = {
  slot: string;
  count: number;
  attendees: SlotCheckInRow[];
};

function buildSlotSummaries(
  attendees: AttendeeSearchResult[] | null | undefined,
  timeslotEnabled: boolean,
): SlotSummary[] {
  if (!attendees || !timeslotEnabled) return [];

  const attendeesBySlot = new Map<string, SlotCheckInRow[]>();

  for (const attendee of attendees) {
    if (!attendee.slot_records || attendee.slot_records.length === 0) continue;

    for (const slotRecord of attendee.slot_records) {
      const slotAttendee: SlotCheckInRow = {
        full_name: attendee.full_name,
        member_id: attendee.member_id,
        recorded_at: slotRecord.recorded_at,
        registration_id: attendee.registration_id,
        public_registration_id: attendee.public_registration_id,
        attendee,
      };

      const current = attendeesBySlot.get(slotRecord.slot) ?? [];
      current.push(slotAttendee);
      attendeesBySlot.set(slotRecord.slot, current);
    }
  }

  const summaries = Array.from(attendeesBySlot.entries()).map(([slot, attendeesList]) => ({
    slot,
    count: attendeesList.length,
    attendees: attendeesList.sort((a, b) => a.full_name.localeCompare(b.full_name)),
  }));

  return summaries.sort((a, b) => {
    const aTime = Date.parse(a.slot);
    const bTime = Date.parse(b.slot);

    if (Number.isFinite(aTime) && Number.isFinite(bTime)) {
      return aTime - bTime;
    }

    return a.slot.localeCompare(b.slot);
  });
}

function buildSeededFields(
  registrationFields: AdminEventField[],
  attendanceFields: AttendanceField[],
): DynamicFieldRef[] {
  return [
    ...registrationFields
      .filter((field) => field.is_active)
      .map((field) => ({
        source: 'registration' as const,
        fieldKey: field.field_key,
        label: field.label,
        sortOrder: field.display_order,
        fieldType: field.field_type,
      })),
    ...attendanceFields.map((field) => ({
      source: 'attendance' as const,
      fieldKey: field.field_key,
      label: field.label,
      sortOrder: field.display_order,
      fieldType: field.field_type,
    })),
    { source: 'member' as const, fieldKey: 'member_id', label: 'RFID', sortOrder: 0 },
    { source: 'role' as const, fieldKey: 'role', label: 'Role', sortOrder: 1 },
    { source: 'category' as const, fieldKey: 'category', label: 'Category', sortOrder: 2 },
    { source: 'member' as const, fieldKey: 'email', label: 'Email', sortOrder: 3 },
    { source: 'member' as const, fieldKey: 'avatar', label: 'Avatar', sortOrder: 4 },
  ];
}

export function AdminAttendanceDashboardPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [selectedFields, setSelectedFields] = useState<DynamicFieldRef[]>([]);
  const [nameOrMemberQuery, setNameOrMemberQuery] = useState('');

  const onNameOrMemberQueryChange = useCallback((value: string) => {
    setNameOrMemberQuery(value);
  }, []);

  const onClearViewControls = useCallback(() => {
    setSelectedFields([]);
    setNameOrMemberQuery('');
  }, []);

  const { data: event, isLoading: eventLoading } = useAdminEventQuery(eventId);
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettingsQuery(eventId);
  const timeslotEnabled = settings?.timeslot_enabled ?? false;
  const { data: registrationFields = [] } = useAdminEventFieldsQuery(eventId);
  const { data: attendanceFields = [] } = useAttendanceFieldsQuery(eventId, { activeOnly: true });

  const {
    attendees,
    cachedAt,
    isLoading: attendeesLoading,
    isFetching: attendeesFetching,
    isError: isCacheError,
    error: cacheError,
    refresh: refreshCache,
  } = useAttendeesLocalCacheQuery(eventId, { realtimeEnabled: true });

  const slotSummaries = useMemo(
    () => buildSlotSummaries(attendees, timeslotEnabled),
    [attendees, timeslotEnabled],
  );

  const checkedInAttendees = useMemo(
    () => (attendees ?? []).filter((a) => a.check_in_status === 'checked_in'),
    [attendees],
  );

  const seededFields = useMemo(
    () => buildSeededFields(registrationFields, attendanceFields),
    [registrationFields, attendanceFields],
  );

  const dynamicFieldOptions = useMemo(
    () => collectDynamicFieldOptions(attendees ?? [], seededFields),
    [attendees, seededFields],
  );

  const registrationDynamicFieldOptions = useMemo(
    () => dynamicFieldOptions.filter((f) => f.source === 'registration'),
    [dynamicFieldOptions],
  );

  const attendanceDynamicFieldOptions = useMemo(
    () => dynamicFieldOptions.filter((f) => f.source === 'attendance'),
    [dynamicFieldOptions],
  );

  const memberDynamicFieldOptions = useMemo(
    () =>
      dynamicFieldOptions.filter(
        (f) => f.source === 'member' || f.source === 'role' || f.source === 'category',
      ),
    [dynamicFieldOptions],
  );

  const toggleField = useCallback(
    (token: string) => {
      setSelectedFields((prev) => {
        const existing = prev.find((f) => toDynamicFieldToken(f) === token);
        if (existing) return prev.filter((f) => toDynamicFieldToken(f) !== token);
        const field = fromDynamicFieldToken(token, dynamicFieldOptions);
        return field ? [...prev, field] : prev;
      });
    },
    [dynamicFieldOptions],
  );

  // Sorted most-recent first for the live "All" tab
  const sortedCheckedIn = useMemo(
    () =>
      [...checkedInAttendees].sort((a, b) => {
        const aMs = a.official_check_in_time ? Date.parse(a.official_check_in_time) : 0;
        const bMs = b.official_check_in_time ? Date.parse(b.official_check_in_time) : 0;
        return bMs - aMs;
      }),
    [checkedInAttendees],
  );

  const totalCount = (attendees ?? []).length;
  const checkedInCount = checkedInAttendees.length;

  const isLoading = eventLoading || settingsLoading || attendeesLoading;

  const cacheStatusMessage = useMemo(() => {
    if (isCacheError) {
      return (cacheError as Error)?.message ?? 'Failed to load attendee cache.';
    }
    if (cachedAt) {
      return `Last refreshed ${new Date(cachedAt).toLocaleTimeString()}`;
    }
    return 'Loading attendee data...';
  }, [isCacheError, cacheError, cachedAt]);

  if (!eventId) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Check-In Dashboard" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Invalid event ID.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (isLoading) {
    return (
      <AdminPageShell>
        <AdminPageShell.Content isLoading={true} loadingMessage="Loading dashboard...">
          {null}
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const tabs = [
    { id: ALL_TAB, label: 'All Check-Ins', count: checkedInCount },
    ...slotSummaries.map((s) => ({
      id: s.slot,
      label: formatDateTime(s.slot, s.slot),
      count: s.count,
    })),
  ];

  const activeSlot =
    activeTab === ALL_TAB ? null : (slotSummaries.find((s) => s.slot === activeTab) ?? null);

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event?.title ?? 'Event', to: toAdminEventDetail(eventId) },
          { label: 'Attendance', to: toAdminEventAttendance(eventId) },
          { label: 'Dashboard' },
        ]}
        navLinks={<EventNavigationLinks eventId={eventId} currentSection="attendance-dashboard" />}
        title="Check-In Dashboard"
      />

      <AdminPageShell.Content>
        <div className="space-y-6">
          <AttendeeCacheStatusBar
            message={cacheStatusMessage}
            isError={isCacheError}
            isRefreshing={attendeesFetching}
            onRefresh={refreshCache}
          />

          {/* Stats */}
          <SectionCard wrapperClassName="" contentClassName="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border border-border bg-surface p-5 text-center">
              <p className="text-3xl font-bold text-primary">{checkedInCount}</p>
              <p className="mt-1 text-sm text-muted">Checked In</p>
            </article>
            <article className="rounded-2xl border border-border bg-surface p-5 text-center">
              <p className="text-3xl font-bold text-text">{totalCount}</p>
              <p className="mt-1 text-sm text-muted">Total Registered</p>
            </article>
            <article className="rounded-2xl border border-border bg-surface p-5 text-center sm:col-span-1 col-span-2">
              <p className="text-3xl font-bold text-text">
                {totalCount > 0 ? Math.round((checkedInCount / totalCount) * 100) : 0}%
              </p>
              <p className="mt-1 text-sm text-muted">Attendance Rate</p>
            </article>
          </SectionCard>

          <SectionCard>
            <AttendancePrimaryFilters
              viewConfig={{
                visibleFields: selectedFields,
                nameOrMemberQuery,
              }}
              registrationDynamicFieldOptions={registrationDynamicFieldOptions}
              attendanceDynamicFieldOptions={attendanceDynamicFieldOptions}
              memberDynamicFieldOptions={memberDynamicFieldOptions}
              onNameOrMemberQueryChange={onNameOrMemberQueryChange}
              onToggleVisibleField={toggleField}
              canClearFilters={selectedFields.length > 0 || nameOrMemberQuery.length > 0}
              onClearViewControls={onClearViewControls}
            />
          </SectionCard>
          <SectionCard wrapperClassName="rounded-2xl border border-border bg-surface p-1">
            {/* Tab bar */}
            <div className="flex items-center justify-between gap-2 border-b border-border pr-4">
              <div className="overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <nav className="-mb-px flex gap-0 px-4" role="tablist">
                  {tabs.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                      <button
                        key={tab.id}
                        role="tab"
                        aria-selected={isActive}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={[
                          'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors',
                          isActive
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted hover:text-text',
                        ].join(' ')}
                      >
                        {tab.label}
                        <span
                          className={[
                            'rounded-full px-1.5 py-0.5 text-xs font-semibold',
                            isActive ? 'bg-primary text-white' : 'bg-border text-muted',
                          ].join(' ')}
                        >
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Tab panel */}
            <div className="overflow-x-auto p-4">
              {activeTab === ALL_TAB ? (
                <AllCheckInsTable rows={sortedCheckedIn} selectedFields={selectedFields} />
              ) : (
                <SlotTabPanel
                  rows={activeSlot?.attendees ?? []}
                  slotLabel={formatDateTime(activeTab, activeTab)}
                  selectedFields={selectedFields}
                />
              )}
            </div>
          </SectionCard>
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
