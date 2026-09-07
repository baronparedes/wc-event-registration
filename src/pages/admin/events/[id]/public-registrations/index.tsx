import { useEffect, useMemo, useState } from 'react';

import { Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { FormInputField } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { PAGINATION_DEFAULTS, ROUTE_PATHS, TIMING, toRoute } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminEventQuery } from '@/hooks/domain/events';
import { useAdminPublicRegistrationsQuery } from '@/hooks/domain/public-registrations';
import { useInfiniteScrollTrigger } from '@/hooks/utils';
import { canAdminPerform } from '@/lib/domain/auth';
import { EventNavigationLinks } from '@/pages/admin/events/components';

import { PublicRegistrationsList } from '../registrations/components';

export function AdminPublicRegistrationsPage() {
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
  const publicRegistrationsQuery = useAdminPublicRegistrationsQuery(eventId ?? '', {
    pageSize: PAGINATION_DEFAULTS.adminRegistrationsPageSize,
    searchTerm: normalizedSearchTerm,
  });

  const pages = publicRegistrationsQuery.data?.pages;
  const registrations = useMemo(() => pages?.flatMap((page) => page.items) ?? [], [pages]);
  const totalCount = pages?.[0]?.totalCount ?? 0;
  const hasNextPage = Boolean(publicRegistrationsQuery.hasNextPage);
  const isFetchingNextPage = Boolean(publicRegistrationsQuery.isFetchingNextPage);
  const fetchNextPage = publicRegistrationsQuery.fetchNextPage;

  const loadMoreRef = useInfiniteScrollTrigger({
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  });

  if (!eventId) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Public Registrations" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Invalid event ID</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const event = eventQuery.data;
  const isLoading = eventQuery.isLoading || publicRegistrationsQuery.isLoading;
  const error = eventQuery.error || publicRegistrationsQuery.error;
  const isEventArchived = event?.status === 'archived';
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm);
  }

  if (error) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Manage Public Registrations" />
        <AdminPageShell.Content>
          <div className="rounded-2xl border border-border bg-surface p-4">
            <p className="text-sm text-red-600">
              Error loading public registrations: {String(error)}
            </p>
          </div>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const navActions = (
    <>
      <Button
        asChild
        variant="primaryOutline"
        onClick={() => navigate(toRoute('adminRegistrations', { id: eventId }))}
      >
        View Member Registrations
      </Button>
      {canWrite && (
        <Button
          variant="primaryOutline"
          onClick={() => navigate(toRoute('adminPublicRegistrationsBulkUpload', { id: eventId }))}
        >
          Upload CSV
        </Button>
      )}
    </>
  );

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Events', to: ROUTE_PATHS.adminEvents },
          { label: event?.title ?? 'Event', to: toRoute('adminEventDetail', { id: eventId }) },
          { label: 'Public Registrations' },
        ]}
        navLinks={<EventNavigationLinks eventId={eventId} currentSection="public-registrations" />}
        title="Manage Public Registrations"
        description={`${totalCount} public registrations`}
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
            {isEventArchived
              ? 'This event is archived. Public registrations are read-only.'
              : 'This event is published. All public registrations are visible.'}
          </p>
        </div>
      )}

      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
          <FormInputField
            value={searchTerm}
            onChange={(event) => handleSearchTermChange(event.target.value)}
            placeholder="Search by name or email"
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
          <PublicRegistrationsList
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
                ? `Showing ${registrations.length} of ${totalCount} public registrations`
                : `Showing all ${totalCount} public registration${totalCount === 1 ? '' : 's'}`}
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
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
