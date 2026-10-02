import { Calendar } from 'lucide-react';

import { EmptyState } from '@/components/ui';
import { Skeleton } from '@/components/ui/Skeleton';
import { usePublicEventListingQuery } from '@/hooks/domain/events';
import { usePublicFormsQuery } from '@/hooks/domain/forms';
import { HubSection, PastEventList, WelcomeHelloBanner } from '@/pages/home/components';
import { CommunityWelcome } from '@/pages/home/components/CommunityWelcome';
import type { HubItem } from '@/pages/home/components/HubSection';

export function HomePage() {
  const {
    data: events,
    isLoading: eventsLoading,
    isError: eventsError,
  } = usePublicEventListingQuery();
  const { data: forms, isLoading: formsLoading, isError: formsError } = usePublicFormsQuery();

  const openEvents = events?.filter((e) => e.listingStatus === 'open') ?? [];
  const upcomingEvents = events?.filter((e) => e.listingStatus === 'upcoming') ?? [];
  const pastEvents = events?.filter((e) => e.listingStatus === 'past') ?? [];

  const openForms = forms?.filter((f) => f.status === 'published') ?? [];

  const isLoading = eventsLoading || formsLoading;

  // Mix open events and forms
  const availableItems: HubItem[] = [
    ...openEvents.map((e) => ({ ...e, type: 'event' as const })),
    ...openForms.map((f) => ({ ...f, type: 'form' as const })),
  ];

  // Upcoming items (currently only events)
  const upcomingItems: HubItem[] = upcomingEvents.map((e) => ({ ...e, type: 'event' as const }));

  return (
    <>
      <section className="space-y-10">
        <WelcomeHelloBanner />
        <CommunityWelcome />
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

        {formsError && (
          <p className="text-sm text-destructive">Unable to load forms. Please try again.</p>
        )}

        {!isLoading &&
          !eventsError &&
          !formsError &&
          availableItems.length === 0 &&
          upcomingItems.length === 0 && (
            <div className="border-y border-border py-8 sm:py-10">
              <EmptyState
                icon={<Calendar aria-hidden="true" className="h-6 w-6" />}
                title="A quiet moment between activities"
                description="There are no open registrations or forms right now."
              />
            </div>
          )}

        <HubSection items={availableItems} title="Available Now" />
        <HubSection items={upcomingItems} title="Upcoming Events" />
        <PastEventList events={pastEvents} />
      </section>
    </>
  );
}
