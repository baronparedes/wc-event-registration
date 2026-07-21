import { useEffect, useMemo, useState } from 'react';

import { Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Button, EmptyState } from '@/components/ui';
import { ActionLink } from '@/components/ui/ActionLink';
import { AdminPaginationControls } from '@/components/ui/AdminPaginationControls';
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
  UI_MESSAGES,
  toAdminEventAttendance,
  toAdminEventAttendanceData,
  toAdminEventDetail,
  toAdminEventFields,
  toAdminEventRegistrations,
} from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminEventsQuery } from '@/hooks/domain/events';
import { canWriteAdminData } from '@/lib/domain/auth';
import { formatDateOnly, getCurrentPageFromCursor, getPageCursor } from '@/lib/infrastructure';

import { DuplicatePolicyLabel, EventStatusBadge } from './components';

export function AdminEventsPage() {
  const navigate = useNavigate();
  const { data: authState } = useAdminAuthQuery();
  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.adminEventsPageSize);
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

  const eventsQuery = useAdminEventsQuery({ pageSize, cursor, searchTerm: normalizedSearchTerm });
  const events = eventsQuery.data?.items ?? [];
  const hasMore = eventsQuery.data?.hasMore ?? false;
  const nextCursor = eventsQuery.data?.nextCursor ?? null;
  const totalPages = eventsQuery.data?.totalPages ?? 1;
  const currentPage = getCurrentPageFromCursor(cursor, pageSize);

  const isLoading = eventsQuery.isLoading;
  const error = eventsQuery.error;
  const canWrite = canWriteAdminData(authState?.adminRole);

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

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setCursor(null);
  }

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm);
    setCursor(null);
  }

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[{ label: 'Events' }]}
        title="Manage Events"
        description="Create, edit, archive, and manage registration behavior."
        actions={
          canWrite ? (
            <Button
              size="md"
              variant="default"
              onClick={() => navigate(ROUTE_PATHS.adminEventNew)}
              className="w-full sm:w-auto sm:inline-flex"
            >
              <Plus className="h-4 w-4" />
              New Event
            </Button>
          ) : undefined
        }
      />

      <AdminPageShell.Filters>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex w-full flex-col gap-1 text-sm text-muted sm:max-w-md">
            Search events
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => handleSearchTermChange(event.target.value)}
              placeholder="Search by event title or slug"
              className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSearchTermChange('')}
            disabled={normalizedSearchTerm.length === 0}
          >
            Clear
          </Button>
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content isLoading={isLoading} loadingMessage={UI_MESSAGES.loading.events}>
        {error && (
          <div className="rounded-2xl border border-border bg-surface p-6">
            <p className="text-sm text-red-600">{UI_MESSAGES.errors.eventsLoadFailed}</p>
          </div>
        )}

        {!error && events.length === 0 && (
          <div className="rounded-2xl border border-border bg-surface px-6 py-12">
            <EmptyState
              icon={<Plus className="h-6 w-6" />}
              title="No events yet"
              description={
                canWrite
                  ? 'Create your first event to get started with registrations.'
                  : 'Events will appear here once an admin creates them.'
              }
              action={
                canWrite ? (
                  <Button asChild size="md" variant="default">
                    <Link to={ROUTE_PATHS.adminEventNew}>Create Event</Link>
                  </Button>
                ) : undefined
              }
            />
          </div>
        )}

        {!error && events.length > 0 && (
          <div className="rounded-2xl border border-border bg-surface">
            <ListTable>
              <ListTableHead>
                <ListTableHeaderRow>
                  <ListTableHeaderCell className="px-6">Event</ListTableHeaderCell>
                  <ListTableHeaderCell>Status</ListTableHeaderCell>
                  <ListTableHeaderCell>Duplicate Policy</ListTableHeaderCell>
                  <ListTableHeaderCell>Reg. Mode</ListTableHeaderCell>
                  <ListTableHeaderCell>Starts</ListTableHeaderCell>
                  <ListTableHeaderCell>Actions</ListTableHeaderCell>
                </ListTableHeaderRow>
              </ListTableHead>
              <ListTableBody>
                {events.map((event) => (
                  <ListTableRow
                    key={event.id}
                    className={canWrite ? 'cursor-pointer' : undefined}
                    onClick={canWrite ? () => navigate(toAdminEventDetail(event.id)) : undefined}
                  >
                    <ListTableCell className="px-6">
                      <p className="font-medium text-text">{event.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{event.slug}</p>
                    </ListTableCell>
                    <ListTableCell>
                      <EventStatusBadge status={event.status} />
                    </ListTableCell>
                    <ListTableCell>
                      <DuplicatePolicyLabel policy={event.duplicate_policy} />
                    </ListTableCell>
                    <ListTableCell>
                      <span className="text-sm capitalize text-text">
                        {event.registration_mode}
                      </span>
                    </ListTableCell>
                    <ListTableCell>
                      <span className="text-sm text-text">{formatDateOnly(event.starts_at)}</span>
                    </ListTableCell>
                    <ListTableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-3">
                        {canWrite && (
                          <ActionLink to={toAdminEventDetail(event.id)}>Edit</ActionLink>
                        )}
                        {canWrite && (
                          <ActionLink to={toAdminEventAttendance(event.id)}>Attendance</ActionLink>
                        )}
                        {canWrite && (
                          <ActionLink to={toAdminEventFields(event.id)}>Fields</ActionLink>
                        )}
                        <ActionLink to={toAdminEventAttendanceData(event.id)}>
                          Attendee Details
                        </ActionLink>
                        <ActionLink to={toAdminEventRegistrations(event.id)}>
                          Registrations
                        </ActionLink>
                      </div>
                    </ListTableCell>
                  </ListTableRow>
                ))}
              </ListTableBody>
            </ListTable>

            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="hidden text-xs text-muted sm:block">
                {normalizedSearchTerm.length > 0
                  ? `Showing up to ${pageSize} matching events per page`
                  : `Showing up to ${pageSize} events per page`}
              </p>
              <AdminPaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                isLoading={isLoading}
                canGoPrevious={currentPage > 1}
                canGoNext={hasMore && Boolean(nextCursor)}
                pageSize={pageSize}
                pageSizeOptions={PAGINATION_OPTIONS.adminEvents}
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
