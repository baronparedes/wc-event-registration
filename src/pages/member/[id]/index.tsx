import { useMemo, useState } from 'react';

import { useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Avatar } from '@/components/ui/Avatar';
import { SectionCard } from '@/components/ui/SectionCard';
import { ROUTE_PATHS, UI_MESSAGES, toAdminMemberDetail } from '@/config/constants';
import { useAdminMemberQuery, useMemberEventHistoryQuery } from '@/hooks/domain/members';
import { formatDateOnly, formatDateTime } from '@/lib/infrastructure';

import {
  EventGroupCard,
  EventSingleCard,
  type MemberEventGroup,
} from './components/EventHistoryCard';
import { EventRegistrationsModal } from './components/EventRegistrationsModal';

export function MemberProfilePage() {
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
        <AdminPageShell.Header title="Member Profile" />
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
        <AdminPageShell.Header title="Member Profile" />
        <AdminPageShell.Content>
          <p className="text-sm text-red-600">{UI_MESSAGES.errors.memberNotFound}</p>
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  const member = memberQuery.data;
  const trimmedName = `${member.nickname ?? ''} ${member.last_name ?? ''}`.trim();
  const avatarName = trimmedName !== '' ? trimmedName : member.full_name;

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        breadcrumbs={[
          { label: 'Members', to: ROUTE_PATHS.adminMembers },
          { label: member.full_name, to: toAdminMemberDetail(id) },
          { label: 'Event History' },
        ]}
        title="Event History"
        description="Member's event registrations and attendance."
      />

      <AdminPageShell.Content>
        <div className="space-y-6">
          <SectionCard>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <Avatar
                name={avatarName}
                avatarObjectKey={member.avatar_object_key}
                size="xl"
                className="shrink-0 self-center sm:self-start"
              />
              <dl className="grid min-w-0 flex-1 grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-muted">Full Name</dt>
                  <dd className="break-words font-medium text-text">{member.full_name}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted">Member ID</dt>
                  <dd className="break-words font-medium text-text">{member.member_id}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted">Role</dt>
                  <dd className="break-words font-medium text-text">{member.role}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-muted">Category</dt>
                  <dd className="break-words font-medium text-text">{member.category}</dd>
                </div>
                {member.email && (
                  <div className="min-w-0">
                    <dt className="text-muted">Email</dt>
                    <dd className="break-all font-medium text-text">{member.email}</dd>
                  </div>
                )}
                {member.date_of_birth && (
                  <div className="min-w-0">
                    <dt className="text-muted">Date of Birth</dt>
                    <dd className="break-words font-medium text-text">
                      {formatDateOnly(member.date_of_birth)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </SectionCard>

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
