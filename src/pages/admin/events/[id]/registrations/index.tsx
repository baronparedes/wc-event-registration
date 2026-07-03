import { useEffect, useMemo, useState } from 'react';

import { useNavigate, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { ActionLink } from '@/components/ui/ActionLink';
import { AdminPaginationControls } from '@/components/ui/AdminPaginationControls';
import { Button } from '@/components/ui/Button';
import {
  PAGINATION_DEFAULTS,
  PAGINATION_OPTIONS,
  ROUTE_PATHS,
  TIMING,
  toAdminEventDetail,
  toAdminEventPublicRegistrations,
} from '@/config/constants';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useAdminRegistrationsQuery } from '@/hooks/domain/registrations';
import { getCurrentPageFromCursor, getPageCursor } from '@/lib/infrastructure';

import { CopyNamesButton, ExportButton, RegistrationsList } from './components';

export function AdminRegistrationsPage() {
  const { id: eventId } = useParams<{ id: string }>();

  const [pageSize, setPageSize] = useState<number>(PAGINATION_DEFAULTS.adminRegistrationsPageSize);
  const [cursor, setCursor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const normalizedSearchTerm = useMemo(() => debouncedSearchTerm.trim(), [debouncedSearchTerm]);

  const navigate = useNavigate();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, TIMING.searchDebounceMs);
    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm]);

  const eventQuery = useAdminEventQuery(eventId ?? '');
  const registrationsQuery = useAdminRegistrationsQuery(eventId ?? '', {
    pageSize,
    cursor,
    searchTerm: normalizedSearchTerm,
  });

  if (!eventId) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Registrations" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Invalid event ID</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const pagedResult = registrationsQuery.data;
  const registrations = pagedResult?.items ?? [];
  const totalRegistrations = pagedResult?.totalCount ?? 0;
  const hasMore = pagedResult?.hasMore ?? false;
  const nextCursor = pagedResult?.nextCursor ?? null;
  const totalPages = pagedResult?.totalPages ?? 1;
  const currentPage = getCurrentPageFromCursor(cursor, pageSize);

  const isLoading = eventQuery.isLoading || registrationsQuery.isLoading;
  const error = eventQuery.error || registrationsQuery.error;
  const hasRegistrations = totalRegistrations > 0;

  if (error) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Registrations" />
        <AdminPageShell.Content>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-red-600">Error loading registrations: {String(error)}</p>
          </div>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const event = eventQuery.data;
  const isEventArchived = event?.status === 'archived';

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm);
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

  function handlePageSizeChange(nextPageSize: number) {
    setPageSize(nextPageSize);
    setCursor(null);
  }

  const navActions = (
    <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end">
      <Button
        asChild
        variant="primaryOutline"
        size="sm"
        onClick={() => navigate(toAdminEventPublicRegistrations(eventId))}
      >
        View Public Registrations
      </Button>
      <CopyNamesButton
        eventId={eventId}
        eventTitle={event?.title}
        disabled={isLoading || !hasRegistrations}
      />
      <ExportButton eventId={eventId} disabled={isLoading || !hasRegistrations} />
    </div>
  );

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event?.title ?? 'Event', to: toAdminEventDetail(eventId) },
          { label: 'Registrations' },
        ]}
        navLinks={<ActionLink to={toAdminEventDetail(eventId)}>Back to Event</ActionLink>}
        title="Registrations"
        description={`Page ${currentPage} of ${totalPages} • ${registrations.length} member registrations on this page`}
        actions={navActions}
      />

      {event && event.status !== 'draft' && (
        <div
          className={`rounded-lg p-3 ${
            event.status === 'archived'
              ? 'border border-yellow-200 bg-yellow-50'
              : 'border border-blue-200 bg-blue-50'
          }`}
        >
          <p
            className={`text-sm font-medium ${
              event.status === 'archived' ? 'text-yellow-800' : 'text-blue-800'
            }`}
          >
            {event.status === 'archived'
              ? 'This event is archived. Registrations cannot be cancelled.'
              : 'This event is published. All registrations are visible.'}
          </p>
        </div>
      )}

      <AdminPageShell.Filters>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <label className="flex w-full flex-col gap-1 text-sm text-muted sm:max-w-md">
            Search registrations
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => handleSearchTermChange(event.target.value)}
              placeholder="Search by name, member ID, or email"
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

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading registrations...">
        <div className="rounded-2xl border border-border bg-surface">
          <RegistrationsList
            registrations={registrations}
            isLoading={isLoading}
            eventId={eventId}
            isEventArchived={isEventArchived}
            searchTerm={normalizedSearchTerm}
          />

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="hidden text-xs text-muted sm:block">
              {normalizedSearchTerm.length > 0
                ? `Showing up to ${pageSize} matching registrations per page`
                : `Showing up to ${pageSize} registrations per page`}
            </p>
            <AdminPaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              isLoading={isLoading}
              canGoPrevious={currentPage > 1}
              canGoNext={hasMore && Boolean(nextCursor)}
              pageSize={pageSize}
              pageSizeOptions={PAGINATION_OPTIONS.adminRegistrations}
              onPageSizeChange={handlePageSizeChange}
              onFirstPage={handleFirstPage}
              onPreviousPage={handlePreviousPage}
              onNextPage={handleNextPage}
              onLastPage={handleLastPage}
              onGoToPage={handleGoToPage}
            />
          </div>
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
