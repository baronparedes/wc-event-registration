import { useEffect, useMemo, useRef, useState } from 'react';

import { Loader2, UserMinus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { AdminPageShell } from '@/components/layout';
import { Button } from '@/components/ui/Button';
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
import { PAGINATION_DEFAULTS, ROUTE_PATHS, TIMING, toRoute } from '@/config/constants';
import {
  useAttendanceSettingsQuery,
  useAttendanceUnregisteredMembersQuery,
  useExportUnregisteredMembersCSVMutation,
} from '@/hooks/domain/attendance';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { EventNavigationLinks } from '@/pages/admin/events/components';

export function AdminUnregisteredMembersPage() {
  const { id: eventId } = useParams<{ id: string }>();

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
    pageSize: PAGINATION_DEFAULTS.adminMembersPageSize,
    searchTerm: normalizedSearchTerm,
  });
  const exportMutation = useExportUnregisteredMembersCSVMutation(eventId ?? '');

  const pages = unregisteredMembersQuery.data?.pages;
  const members = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  const totalCount = pages?.[0]?.totalCount ?? 0;
  const hasNextPage = Boolean(unregisteredMembersQuery.hasNextPage);
  const isFetchingNextPage = Boolean(unregisteredMembersQuery.isFetchingNextPage);
  const fetchNextPage = unregisteredMembersQuery.fetchNextPage;

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchNextPage();
        }
      },
      { rootMargin: '200px' },
    );

    const currentElement = loadMoreRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const isLoading =
    eventQuery.isLoading || settingsQuery.isLoading || unregisteredMembersQuery.isLoading;
  const error = eventQuery.error || settingsQuery.error || unregisteredMembersQuery.error;
  const attendanceEnabled = settingsQuery.data?.attendance_enabled ?? false;
  const canExportCsv = Boolean(eventQuery.data) && totalCount > 0;

  async function handleExportCsv() {
    if (!eventId || !canExportCsv) {
      return;
    }

    try {
      const { text, filename } = await exportMutation.mutateAsync();
      const blob = new Blob([text], { type: 'text/csv; charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = filename ?? `event-${eventId}-unregistered-members.csv`;
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export CSV.';
      toast.error(message);
    }
  }

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm);
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          {
            label: eventQuery.data?.title ?? 'Event',
            to: eventId ? toRoute('adminEventDetail', { id: eventId }) : undefined,
          },
          {
            label: 'Registrations',
            to: eventId ? toRoute('adminRegistrations', { id: eventId }) : undefined,
          },
          { label: 'Unregistered Members' },
        ]}
        navLinks={
          eventId ? (
            <EventNavigationLinks eventId={eventId} currentSection="registrations" />
          ) : undefined
        }
        title="Unregistered Members Report"
        description={`${totalCount} members without an active registration`}
        actions={
          <Button
            type="button"
            variant="primaryOutline"
            onClick={handleExportCsv}
            disabled={!canExportCsv || exportMutation.isPending}
          >
            {exportMutation.isPending ? 'Exporting...' : 'Export as CSV'}
          </Button>
        }
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
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="flex w-full flex-col gap-1 text-sm text-muted">
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
            className="min-h-10 w-full rounded-md border border-border px-3 py-2 text-sm font-medium text-text transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
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
                        to={toRoute('adminMemberDetail', { id: member.user_id })}
                      >
                        View Member
                      </Link>
                    </ListTableCell>
                  </ListTableRow>
                ))}
              </ListTableBody>
            </ListTable>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-muted">
                {hasNextPage
                  ? `Showing ${members.length} of ${totalCount} unregistered members`
                  : `Showing all ${totalCount} unregistered member${totalCount === 1 ? '' : 's'}`}
              </p>
              {hasNextPage && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primaryOutline"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading...
                      </span>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
            <div ref={loadMoreRef} className="h-1" />
          </div>
        )}
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
