import { useMemo } from 'react';

import { Upload } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { AdminInfiniteScrollFooter, AlertBanner, Button, SearchInputField } from '@/components/ui';
import { PAGINATION_DEFAULTS, ROUTE_PATHS, toRoute } from '@/config/constants';
import { canAdminPerform, useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useAdminRegistrationsQuery } from '@/hooks/domain/registrations';
import { useDebounceSearch, useInfiniteScrollTrigger } from '@/hooks/utils';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { CopyNamesButton, ExportButton, RegistrationsList, ViewNamesButton } from './components';

export function AdminRegistrationsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const { data: authState } = useAdminAuthQuery();
  const navigate = useNavigate();

  const { searchTerm, setSearchTerm, normalizedSearchTerm, clearSearch } = useDebounceSearch();

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

  const { sentinelRef } = useInfiniteScrollTrigger({
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
          <Upload className="mr-2 h-4 w-4" />
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
        <AlertBanner
          variant={event.status === 'archived' ? 'warning' : 'info'}
          description={
            event.status === 'archived'
              ? 'This event is archived. Registrations cannot be cancelled.'
              : 'This event is published. All registrations are visible.'
          }
        />
      )}

      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <SearchInputField
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            onClear={clearSearch}
            placeholder="Search by name, member ID, or email"
          />
          <Button
            type="button"
            variant="primaryOutline"
            onClick={clearSearch}
            disabled={normalizedSearchTerm.length === 0}
          >
            Clear
          </Button>
        </div>
      </AdminPageShell.Filters>

      <AdminPageShell.Content isLoading={isLoading} loadingMessage="Loading registrations...">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
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

        <div className="rounded-2xl border border-border bg-surface">
          <RegistrationsList
            registrations={registrations}
            isLoading={isLoading}
            eventId={eventId}
            isEventArchived={isEventArchived}
            searchTerm={normalizedSearchTerm}
            canWrite={canWrite}
          />

          <AdminInfiniteScrollFooter
            currentCount={registrations.length}
            totalCount={totalCount}
            entityName="registration"
            hasNextPage={hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onFetchNextPage={() => fetchNextPage()}
            sentinelRef={sentinelRef}
          />
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
