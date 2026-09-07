import { useEffect, useMemo, useState } from 'react';

import { Loader2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { FormInputField } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { PAGINATION_DEFAULTS, ROUTE_PATHS, TIMING, toRoute } from '@/config/constants';
import { canAdminPerform, useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useAdminRegistrationsQuery } from '@/hooks/domain/registrations';
import { useInfiniteScrollTrigger } from '@/hooks/utils';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { CopyNamesButton, ExportButton, RegistrationsList, ViewNamesButton } from './components';

export function AdminRegistrationsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: authState } = useAdminAuthQuery();

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
    pageSize: PAGINATION_DEFAULTS.adminRegistrationsPageSize,
    searchTerm: normalizedSearchTerm,
  });

  const pages = registrationsQuery.data?.pages;
  const registrations = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  const totalCount = pages?.[0]?.totalCount ?? 0;
  const hasNextPage = Boolean(registrationsQuery.hasNextPage);
  const isFetchingNextPage = Boolean(registrationsQuery.isFetchingNextPage);
  const fetchNextPage = registrationsQuery.fetchNextPage;

  const loadMoreRef = useInfiniteScrollTrigger({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  if (!eventId) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Registrations" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Invalid event ID</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const isLoading = eventQuery.isLoading || registrationsQuery.isLoading;
  const error = eventQuery.error || registrationsQuery.error;
  const hasRegistrations = totalCount > 0;
  const canRead = canAdminPerform(authState?.adminRole, 'canReadAdminData');
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const canExport = canAdminPerform(authState?.adminRole, 'canExportAdminReports');

  if (error) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Registrations" />
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
  }

  const navActions = (
    <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:justify-end">
      <CopyNamesButton
        eventId={eventId}
        eventTitle={event?.title}
        disabled={isLoading || !hasRegistrations}
      />
      <ViewNamesButton eventId={eventId} disabled={isLoading || !hasRegistrations} />
      {!canWrite && canExport && (
        <ExportButton eventId={eventId} disabled={isLoading || !hasRegistrations} />
      )}
      {canWrite && (
        <Button asChild variant="primaryOutline">
          <Link to={toRoute('adminRegistrationsBulkUpload', { id: eventId })}>Upload CSV</Link>
        </Button>
      )}
    </div>
  );

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event?.title ?? 'Event', to: toRoute('adminEventDetail', { id: eventId }) },
          { label: 'Registrations' },
        ]}
        navLinks={<EventNavigationLinks eventId={eventId} currentSection="registrations" />}
        title="Manage Registrations"
        description={`${totalCount} member registrations`}
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
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
          <FormInputField
            value={searchTerm}
            onChange={(event) => handleSearchTermChange(event.target.value)}
            placeholder="Search by name, member ID, or email"
            inputClassName="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
          <Button
            type="button"
            variant="primaryOutline"
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
            canWrite={canWrite}
          />

          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-xs text-muted">
              {hasNextPage
                ? `Showing ${registrations.length} of ${totalCount} registrations`
                : `Showing all ${totalCount} registration${totalCount === 1 ? '' : 's'}`}
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

        <div className="flex flex-col gap-2 pt-6 sm:flex-row sm:justify-end">
          {canWrite && (
            <Button
              type="button"
              variant="primaryOutline"
              onClick={() =>
                navigate(toRoute('adminAttendanceUnregisteredMembers', { id: eventId }))
              }
            >
              View Unregistered Members
            </Button>
          )}
          {canRead && (
            <Button
              variant="primaryOutline"
              onClick={() => navigate(toRoute('adminPublicRegistrations', { id: eventId }))}
            >
              View Public Registrations
            </Button>
          )}
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
