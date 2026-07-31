import { useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui';
import { ROUTE_PATHS, toAdminEventAttendance, toAdminEventDetail } from '@/config/constants';
import {
  useAttendanceSettingsQuery,
  useAttendeesLocalCacheQuery,
} from '@/hooks/domain/attendance/queries';
import { useAdminEventQuery } from '@/hooks/domain/events';
import type { AttendeeSearchResult } from '@/lib/domain/attendance';
import { formatCompactSlotLabelsFromSlotRecords } from '@/lib/domain/attendance';
import { formatDateTime } from '@/lib/infrastructure';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { AttendeeCacheStatusBar } from '../components/AttendeeCacheStatusBar';

type AllCheckInRow = Pick<
  AttendeeSearchResult,
  'registration_id' | 'full_name' | 'member_id' | 'official_check_in_time' | 'slot_records'
>;

type SlotCheckInRow = {
  full_name: string;
  member_id: string | null;
  recorded_at: string;
  registration_id: string | null;
  public_registration_id: string | null;
};

function AllCheckInsTable({ rows }: { rows: AllCheckInRow[] }) {
  if (rows.length === 0) {
    return <p className="py-4 text-sm text-muted">No attendees have checked in yet.</p>;
  }
  return (
    <ListTable density="dense">
      <ListTableHead>
        <ListTableHeaderRow variant="muted">
          <ListTableHeaderCell>#</ListTableHeaderCell>
          <ListTableHeaderCell>Name</ListTableHeaderCell>
          <ListTableHeaderCell>Member ID</ListTableHeaderCell>
          <ListTableHeaderCell>Slot Record</ListTableHeaderCell>
          <ListTableHeaderCell>Check-In Time</ListTableHeaderCell>
        </ListTableHeaderRow>
      </ListTableHead>
      <ListTableBody>
        {rows.map((row, index) => (
          <ListTableRow key={row.registration_id}>
            <ListTableCell className="text-muted w-8">{rows.length - index}</ListTableCell>
            <ListTableCell className="font-medium">{row.full_name}</ListTableCell>
            <ListTableCell className="text-muted">{row.member_id ?? '—'}</ListTableCell>
            <ListTableCell className="text-muted">
              {(() => {
                const slotRecordLabels = formatCompactSlotLabelsFromSlotRecords(row.slot_records);

                if (slotRecordLabels.length === 0) {
                  return '—';
                }

                return (
                  <div className="flex flex-wrap gap-1">
                    {slotRecordLabels.map((label, labelIndex) => (
                      <span
                        key={`${row.registration_id}:slot-record:${label}:${labelIndex}`}
                        className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                );
              })()}
            </ListTableCell>
            <ListTableCell className="text-muted">
              {row.official_check_in_time
                ? formatDateTime(row.official_check_in_time, row.official_check_in_time)
                : '—'}
            </ListTableCell>
          </ListTableRow>
        ))}
      </ListTableBody>
    </ListTable>
  );
}

type SlotTabPanelProps = {
  rows: SlotCheckInRow[];
  slotLabel: string;
};

function SlotTabPanel({ rows, slotLabel }: SlotTabPanelProps) {
  const earliest = rows.length
    ? rows.reduce((a, b) => (a.recorded_at < b.recorded_at ? a : b)).recorded_at
    : null;
  const latest = rows.length
    ? rows.reduce((a, b) => (a.recorded_at > b.recorded_at ? a : b)).recorded_at
    : null;

  return (
    <div className="space-y-4">
      {/* Compact slot stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <p className="text-xl font-bold text-primary">{rows.length}</p>
          <p className="mt-0.5 text-xs text-muted">Checked In</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <p className="text-xl font-bold text-text">
            {earliest ? formatDateTime(earliest, earliest) : '—'}
          </p>
          <p className="mt-0.5 text-xs text-muted">First Arrival</p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 text-center">
          <p className="text-xl font-bold text-text">
            {latest ? formatDateTime(latest, latest) : '—'}
          </p>
          <p className="mt-0.5 text-xs text-muted">Latest Arrival</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="py-4 text-sm text-muted">No attendees for {slotLabel}.</p>
      ) : (
        <ListTable density="dense">
          <ListTableHead>
            <ListTableHeaderRow variant="muted">
              <ListTableHeaderCell>#</ListTableHeaderCell>
              <ListTableHeaderCell>Name</ListTableHeaderCell>
              <ListTableHeaderCell>Member ID</ListTableHeaderCell>
              <ListTableHeaderCell>Slot Check-In Time</ListTableHeaderCell>
            </ListTableHeaderRow>
          </ListTableHead>
          <ListTableBody>
            {rows.map((row, index) => (
              <ListTableRow
                key={`${row.registration_id || row.public_registration_id}-${row.recorded_at}`}
              >
                <ListTableCell className="text-muted w-8">{index + 1}</ListTableCell>
                <ListTableCell className="font-medium">{row.full_name}</ListTableCell>
                <ListTableCell className="text-muted">{row.member_id ?? '—'}</ListTableCell>
                <ListTableCell className="text-muted">
                  {formatDateTime(row.recorded_at, row.recorded_at)}
                </ListTableCell>
              </ListTableRow>
            ))}
          </ListTableBody>
        </ListTable>
      )}
    </div>
  );
}

const ALL_TAB = '__all__';

export function AdminAttendanceDashboardPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState(ALL_TAB);

  const { data: event, isLoading: eventLoading } = useAdminEventQuery(eventId);
  const { data: settings, isLoading: settingsLoading } = useAttendanceSettingsQuery(eventId);
  const timeslotEnabled = settings?.timeslot_enabled ?? false;

  const {
    attendees,
    cachedAt,
    isLoading: attendeesLoading,
    isFetching: attendeesFetching,
    isError: isCacheError,
    error: cacheError,
    refresh: refreshCache,
  } = useAttendeesLocalCacheQuery(eventId, { realtimeEnabled: true });

  // Derive slot summaries from attendees.slot_records
  const slotSummaries = useMemo(() => {
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
  }, [attendees, timeslotEnabled]);

  const checkedInAttendees = useMemo(
    () => (attendees ?? []).filter((a) => a.check_in_status === 'checked_in'),
    [attendees],
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
          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
          </section>

          {/* Tabbed attendee list */}
          <section className="rounded-2xl border border-border bg-surface">
            {/* Tab bar */}
            <div className="overflow-x-auto border-b border-border [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
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

            {/* Tab panel */}
            <div className="overflow-x-auto p-4">
              {activeTab === ALL_TAB ? (
                <AllCheckInsTable rows={sortedCheckedIn} />
              ) : (
                <SlotTabPanel
                  rows={activeSlot?.attendees ?? []}
                  slotLabel={formatDateTime(activeTab, activeTab)}
                />
              )}
            </div>
          </section>
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
