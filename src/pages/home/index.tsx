import { ArrowRight, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button, EmptyState } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { toRoute } from '@/config/constants';
import { usePublicEventListingQuery } from '@/hooks/domain/events';
import { usePublicFormsQuery } from '@/hooks/domain/forms';

import { EventSection } from './components';

export function HomePage() {
  const {
    data: events,
    isLoading: eventsLoading,
    isError: eventsError,
  } = usePublicEventListingQuery();
  const { data: forms, isLoading: formsLoading } = usePublicFormsQuery();

  const openEvents = events?.filter((e) => e.listingStatus === 'open') ?? [];
  const upcomingEvents = events?.filter((e) => e.listingStatus === 'upcoming') ?? [];
  const pastEvents = events?.filter((e) => e.listingStatus === 'past') ?? [];

  const isLoading = eventsLoading || formsLoading;

  return (
    <section className="relative space-y-10">
      <div className="space-y-2">
        <h1 className="font-heading text-3xl font-bold leading-tight text-text md:text-4xl">
          Welcome Hub
        </h1>
        <p className="text-sm text-muted">
          Register for upcoming events or submit requests and area reservations.
        </p>
      </div>

      {isLoading && (
        <div className="space-y-6" aria-hidden="true">
          <div className="space-y-3">
            <Skeleton className="h-5 w-44" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`events-skeleton-${index}`}
                  className="space-y-3 rounded-xl border border-border bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <div className="space-y-2 pt-1">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                  <Skeleton className="mt-2 h-9 w-36" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {eventsError && (
        <p className="text-sm text-destructive">Unable to load events. Please try again.</p>
      )}

      {!isLoading && !eventsError && forms && forms.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-heading text-xl font-bold text-text">Active Forms & Requests</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <div
                key={form.id}
                className="flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-xs transition hover:border-accent"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent capitalize">
                      {form.audience}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-text">{form.title}</h3>
                  {form.description && (
                    <p className="text-xs text-muted line-clamp-2">{form.description}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-border flex justify-end">
                  <Button asChild size="sm" variant="default">
                    <Link to={toRoute('formSubmit', { slug: form.slug })}>
                      Fill Out Form <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isLoading && !eventsError && events?.length === 0 && (!forms || forms.length === 0) && (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title="No items available"
          description="There are currently no open events or active forms. Check back soon!"
        />
      )}

      <EventSection events={openEvents} title="Open for Registration" />
      <EventSection events={upcomingEvents} title="Upcoming Events" />
      <EventSection events={pastEvents} title="Past 3 Months" />
    </section>
  );
}
