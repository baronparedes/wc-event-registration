import { useEffect, useMemo, useRef, useState } from 'react';

import { Loader2, Plus } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { AdminPageShell, AdminSubNavLink } from '@/components/layout';
import { Button, EmptyState, FormInputField } from '@/components/ui';
import { PAGINATION_DEFAULTS, ROUTE_PATHS, TIMING, UI_MESSAGES, toRoute } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { useAdminEventsQuery } from '@/hooks/domain/events';
import { useIsMobileViewport } from '@/hooks/utils';
import { canAdminPerform } from '@/lib/domain/auth';

import { AdminEventsTable, MobileEventCard } from './components';

export function AdminEventsPage() {
  const navigate = useNavigate();
  const { data: authState } = useAdminAuthQuery();
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

  const eventsQuery = useAdminEventsQuery({
    pageSize: PAGINATION_DEFAULTS.adminEventsPageSize,
    searchTerm: normalizedSearchTerm,
  });

  const pages = eventsQuery.data?.pages ?? [];
  const events = useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const totalCount = pages[0]?.totalCount ?? 0;
  const hasNextPage = Boolean(eventsQuery.hasNextPage);
  const isFetchingNextPage = Boolean(eventsQuery.isFetchingNextPage);
  const fetchNextPage = eventsQuery.fetchNextPage;

  const isLoading = eventsQuery.isLoading;
  const error = eventsQuery.error;
  const canWrite = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const canRead = canAdminPerform(authState?.adminRole, 'canReadAdminData');
  const canAccessCheckIn = canAdminPerform(authState?.adminRole, 'canAccessAttendanceCheckIn');
  const isMobileViewport = useIsMobileViewport();

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

  function handleSearchTermChange(nextSearchTerm: string) {
    setSearchTerm(nextSearchTerm);
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
              <Plus className="h-5 w-5" />
              New Event
            </Button>
          ) : undefined
        }
      />

      <AdminPageShell.SubNav>
        <AdminSubNavLink to={ROUTE_PATHS.adminEvents}>Events</AdminSubNavLink>
        {(canWrite || canRead) && (
          <AdminSubNavLink to={ROUTE_PATHS.adminMembers}>Members</AdminSubNavLink>
        )}
      </AdminPageShell.SubNav>

      <AdminPageShell.Filters>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
          <FormInputField
            value={searchTerm}
            onChange={(event) => handleSearchTermChange(event.target.value)}
            placeholder="Search by event title or slug"
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
            {isMobileViewport ? (
              <div className="space-y-3 p-3">
                {events.map((event) => (
                  <MobileEventCard
                    key={event.id}
                    event={event}
                    canWrite={canWrite}
                    canRead={canRead}
                    canAccessCheckIn={canAccessCheckIn}
                  />
                ))}
              </div>
            ) : (
              <AdminEventsTable
                events={events}
                canWrite={canWrite}
                canRead={canRead}
                canAccessCheckIn={canAccessCheckIn}
                onEventSelect={(eventId) => navigate(toRoute('adminEventDetail', { id: eventId }))}
              />
            )}

            <div className="flex flex-col gap-3 border-t border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs text-muted">
                {hasNextPage
                  ? `Showing ${events.length} of ${totalCount} events`
                  : `Showing all ${totalCount} event${totalCount === 1 ? '' : 's'}`}
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
