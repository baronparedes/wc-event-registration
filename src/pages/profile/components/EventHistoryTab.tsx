import { useMemo, useState } from 'react';

import { SectionCard } from '@/components/ui/SectionCard';
import { useMemberEventHistoryQuery } from '@/hooks/domain/members';
import { formatDateTime } from '@/lib/infrastructure';
import {
  EventGroupCard,
  EventSingleCard,
  type MemberEventGroup,
} from '@/pages/admin/members/[id]/event-history/components/EventHistoryCard';
import { EventRegistrationsModal } from '@/pages/admin/members/[id]/event-history/components/EventRegistrationsModal';

interface EventHistoryTabProps {
  memberId: string;
}

export function EventHistoryTab({ memberId }: EventHistoryTabProps) {
  const historyQuery = useMemberEventHistoryQuery(memberId);

  const eventGroups = useMemo<MemberEventGroup[]>(() => {
    const map = new Map<string, MemberEventGroup>();
    for (const item of historyQuery.data ?? []) {
      if (!map.has(item.event_id)) {
        map.set(item.event_id, {
          event_id: item.event_id,
          event_title: item.event_title,
          event_slug: item.event_slug,
          starts_at: item.starts_at,
          ends_at: item.ends_at,
          location: item.location,
          registrations: [],
        });
      }
      map.get(item.event_id)!.registrations.push(item);
    }
    return Array.from(map.values());
  }, [historyQuery.data]);

  const [selectedGroup, setSelectedGroup] = useState<MemberEventGroup | null>(null);

  return (
    <>
      <SectionCard
        title={`Event History (${eventGroups.length})`}
        subtitle="All events you have registered for, sorted most recent first."
      >
        {historyQuery.isLoading && <p className="text-base text-muted">Loading event history...</p>}
        {historyQuery.isError && (
          <p className="text-base text-danger">Failed to load event history.</p>
        )}
        {!historyQuery.isLoading && !historyQuery.isError && eventGroups.length === 0 && (
          <p className="text-base text-muted">No events found.</p>
        )}
        {eventGroups.length > 0 && (
          <div className="space-y-4">
            {eventGroups.map((group) =>
              group.registrations.length === 1 ? (
                <EventSingleCard
                  key={group.event_id}
                  group={group}
                  formatDateTime={formatDateTime}
                />
              ) : (
                <EventGroupCard
                  key={group.event_id}
                  group={group}
                  formatDateTime={formatDateTime}
                  onView={() => setSelectedGroup(group)}
                />
              ),
            )}
          </div>
        )}
      </SectionCard>

      <EventRegistrationsModal
        group={selectedGroup}
        isOpen={selectedGroup !== null}
        onClose={() => setSelectedGroup(null)}
        formatDateTime={formatDateTime}
      />
    </>
  );
}
