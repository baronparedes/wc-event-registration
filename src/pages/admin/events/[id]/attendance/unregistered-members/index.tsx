import { useEffect, useMemo, useState } from 'react';

import { UserMinus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { AdminPaginationControls } from '@/components/ui/AdminPaginationControls';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ListTable,
  ListTableBody,
  ListTableCell,
  ListTableHead,
  ListTableHeaderCell,
  ListTableHeaderRow,
  ListTableRow,
} from '@/components/ui/ListTable';
import {
  PAGINATION_DEFAULTS,
  PAGINATION_OPTIONS,
  ROUTE_PATHS,
  TIMING,
  toAdminEventAttendance,
  toAdminEventDetail,
  toAdminMemberDetail,
} from '@/config/constants';
import {
  useAttendanceSettingsQuery,
  useAttendanceUnregisteredMembersQuery,
} from '@/hooks/domain/attendance';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { getCurrentPageFromCursor, getPageCursor } from '@/lib/infrastructure';
import { EventNavigationLinks } from '@/pages/admin/events/components';

export function AdminAttendanceUnregisteredMembersPage() {
  const { id: eventId } = useParams<{ id: string }>();

  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.adminMembersPageSize);
  const [cursor, setCursor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const normalizedSearchTerm = useMemo(() => debouncedSearchTerm.trim(), [debouncedSearchTerm]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, TIMING.searchDebounceMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const eventQuery = useAdminEventQuery(eventId);
  const settingsQuery = useAttendanceSettingsQuery(eventId);
  const unregisteredMembersQuery = useAttendanceUnregisteredMembersQuery(eventId, {
    pageSize,
    cursor,
    searchTerm: normalizedSearchTerm,
  });

  if (!eventId) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Unregistered Members Report" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Invalid event ID.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const membersPage = unregisteredMembersQuery.data;
  const members = membersPage?.items ?? [];
  const hasMore = membersPage?.hasMore ?? false;
  const nextCursor = membersPage?.nextCursor ?? null;
  const totalPages = membersPage?.totalPages ?? 1;
  const totalCount = membersPage?.totalCount ?? 0;
  const currentPage = getCurrentPageFromCursor(cursor, pageSize);

  const isLoading =
    eventQuery.isLoading || settingsQuery.isLoading || unregisteredMembersQuery.isLoading;
  const error = eventQuery.error || settingsQuery.error || unregisteredMembersQuery.error;
  const attendanceEnabled = settingsQuery.data?.attendance_enabled ?? false;

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm);
    setCursor(null);
  }

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setCursor(null);
  }

  function handleNextPage() {
    if (!nextCursor) return;
    setCursor(nextCursor);
  }

  function handlePreviousPage() {
    setCursor(getPageCursor(currentPage - 1, pageSize));
  }

  function handleFirstPage() {
    setCursor(null);
  }

  function handleGoToPage(page: number) {
    setCursor(getPageCursor(page, pageSize));
  }

  function handleLastPage() {
    setCursor(getPageCursor(totalPages, pageSize));
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          {
            label: eventQuery.data?.title ?? 'Event',
            to: eventId ? toAdminEventDetail(eventId) : undefined,
          },
          {
            label: 'Attendance',
            to: eventId ? toAdminEventAttendance(eventId) : undefined,
          },
          { label: 'Unregistered Members' },
        ]}
        navLinks={
          eventId ? (
            <EventNavigationLinks
              eventId={eventId}
              currentSection="attendance-unregistered-members"
            />
          ) : undefined
        }
        title="Unregistered Members Report"
        description={`Page ${currentPage} of ${totalPages} • ${totalCount} members without an active registration`}
      />

      {!isLoading && !attendanceEnabled && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <p className="text-sm font-medium text-blue-800">Attendance tracking is disabled</p>
          <p className="mt-1 text-xs text-blue-700">
            This report still works and shows members who have not yet registered for this event.
          </p>
        </div>
      )}

      <AdminPageShell.Filters>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex w-full flex-col gap-1 text-sm text-muted sm:max-w-md">
            Search members
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => handleSearchTermChange(event.target.value)}
              placeholder="Search by member ID, name, or email"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>
          <button
            type="button"
            onClick={() => handleSearchTermChange('')}
            disabled={normalizedSearchTerm.length === 0}
            className="min-h-10 rounded-md border border-border px-3 py-2 text-sm font-medium text-text transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear
          </button>
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content
        isLoading={isLoading}
        loadingMessage="Loading unregistered members report..."
      >
        {!eventQuery.data ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Event not found.{' '}
            <Link className="underline" to={ROUTE_PATHS.adminEvents}>
              Back to events
            </Link>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-red-600">
            Failed to load unregistered members report.
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<UserMinus className="h-6 w-6" />}
              title={
                normalizedSearchTerm.length > 0
                  ? 'No matching unregistered members'
                  : 'All active members are registered'
              }
              description={
                normalizedSearchTerm.length > 0
                  ? 'Try adjusting your search filters.'
                  : 'There are currently no members pending registration for this event.'
              }
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface">
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell className="px-6">Member ID</ListTableHeaderCell>
                  <ListTableHeaderCell>Name</ListTableHeaderCell>
                  <ListTableHeaderCell>Email</ListTableHeaderCell>
                  <ListTableHeaderCell>Role</ListTableHeaderCell>
                  <ListTableHeaderCell>Category</ListTableHeaderCell>
                  <ListTableHeaderCell>Actions</ListTableHeaderCell>
                </ListTableHeaderRow>
              </ListTableHead>
              <ListTableBody>
                {members.map((member) => (
                  <ListTableRow key={member.user_id}>
                    <ListTableCell className="px-6">
                      <p className="font-mono text-sm text-text">{member.member_id || '—'}</p>
                    </ListTableCell>
                    <ListTableCell>
                      <p className="text-sm font-medium text-text">{member.full_name}</p>
                    </ListTableCell>
                    <ListTableCell>
                      <p className="text-sm text-text">{member.email || '—'}</p>
                    </ListTableCell>
                    <ListTableCell>
                      <p className="text-sm text-text">{member.role || '—'}</p>
                    </ListTableCell>
                    <ListTableCell>
                      <p className="text-sm text-text">{member.category || '—'}</p>
                    </ListTableCell>
                    <ListTableCell>
                      <Link
                        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                        to={toAdminMemberDetail(member.user_id)}
                      >
                        View Member
                      </Link>
                    </ListTableCell>
                  </ListTableRow>
                ))}
              </ListTableBody>
            </ListTable>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="hidden text-xs text-muted sm:block">
                {normalizedSearchTerm.length > 0
                  ? `Showing up to ${pageSize} matching unregistered members per page`
                  : `Showing up to ${pageSize} unregistered members per page`}
              </p>
              <AdminPaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                isLoading={isLoading}
                canGoPrevious={currentPage > 1}
                canGoNext={hasMore && Boolean(nextCursor)}
                pageSize={pageSize}
                pageSizeOptions={PAGINATION_OPTIONS.adminMembers}
                onPageSizeChange={handlePageSizeChange}
                onFirstPage={handleFirstPage}
                onPreviousPage={handlePreviousPage}
                onNextPage={handleNextPage}
                onLastPage={handleLastPage}
                onGoToPage={handleGoToPage}
              />
            </div>
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
