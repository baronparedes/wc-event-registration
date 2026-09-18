import { useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { SectionCard } from '@/components/ui/SectionCard';
import { ROUTE_PATHS, UI_MESSAGES, toRoute } from '@/config/constants';
import { useAdminMemberQuery, useMemberEventHistoryQuery } from '@/hooks/domain/members';
import { formatDateTime } from '@/lib/infrastructure';
import { MemberNavigationLinks } from '@/pages/admin/members/components/MemberNavigationLinks';
import { MemberOverviewCard } from '@/pages/admin/members/components/MemberOverviewCard';

import {
  EventGroupCard,
  EventSingleCard,
  type MemberEventGroup,
} from './components/EventHistoryCard';
import { EventRegistrationsModal } from './components/EventRegistrationsModal';

export function AdminMemberEventHistoryPage() {
  const { id } = useParams<{ id: string }>();

  const memberQuery = useAdminMemberQuery(id, { includeInactive: true });
  const historyQuery = useMemberEventHistoryQuery(id);

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

  if (!id) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Event History" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">Member ID is missing.</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (memberQuery.isLoading) {
    return (
      <AdminPageShell>
        <AdminPageShell.Content isLoading={true} loadingMessage={UI_MESSAGES.loading.member}>
          {null}
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (memberQuery.isError || !memberQuery.data) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Event History" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">{UI_MESSAGES.errors.memberNotFound}</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const member = memberQuery.data;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Members', to: ROUTE_PATHS.adminMembers },
          { label: member.full_name, to: toRoute('adminMemberDetail', { id }) },
          { label: 'Event History' },
        ]}
        navLinks={<MemberNavigationLinks memberId={id} />}
        title="Event History"
        description="Member's event registrations and attendance."
      />

      <AdminPageShell.Content>
        <div className="space-y-6">
          <MemberOverviewCard member={member} />

          <SectionCard
            title={`Event History (${eventGroups.length})`}
            subtitle="All events this member has registered for, sorted most recent first."
          >
            {historyQuery.isLoading && (
              <p className="text-sm text-muted">Loading event history...</p>
            )}
            {historyQuery.isError && (
              <p className="text-sm text-red-600">Failed to load event history.</p>
            )}
            {!historyQuery.isLoading && !historyQuery.isError && eventGroups.length === 0 && (
              <p className="text-sm text-muted">No events found for this member.</p>
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
        </div>

        <EventRegistrationsModal
          group={selectedGroup}
          isOpen={selectedGroup !== null}
          onClose={() => setSelectedGroup(null)}
          formatDateTime={formatDateTime}
        />
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
