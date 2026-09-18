import { useMemo, useState } from 'react';

import { Navigate } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { SectionCard } from '@/components/ui/SectionCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ROUTE_PATHS, UI_MESSAGES } from '@/config/constants';
import { useCurrentProfileQuery, useMemberEventHistoryQuery } from '@/hooks/domain/members';
import { formatDateOnly, formatDateTime } from '@/lib/infrastructure';
import {
  EventGroupCard,
  EventSingleCard,
  type MemberEventGroup,
} from '@/pages/admin/members/[id]/event-history/components/EventHistoryCard';
import { EventRegistrationsModal } from '@/pages/admin/members/[id]/event-history/components/EventRegistrationsModal';

import { ServiceAttendanceHistoryTab } from './components/ServiceAttendanceHistoryTab';
import { SundayAvailabilityDisplay } from './components/SundayAvailabilityDisplay';

const SUNDAY_KEYS = [
  'first_sunday',
  'second_sunday',
  'third_sunday',
  'fourth_sunday',
  'fifth_sunday',
];

// Helper to convert snake_case to Title Case
function toTitleCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function ProfilePage() {
  const profileQuery = useCurrentProfileQuery();
  const member = profileQuery.data;

  const historyQuery = useMemberEventHistoryQuery(member?.id);

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
  const [activeTab, setActiveTab] = useState<'events' | 'service_attendance'>('events');

  if (profileQuery.isLoading) {
    return (
      <AdminPageShell>
        <AdminPageShell.Content isLoading={true} loadingMessage={UI_MESSAGES.loading.member}>
          {null}
        </AdminPageShell.Content>
      </AdminPageShell>
    );
  }

  if (profileQuery.isError || !member) {
    return <Navigate to={ROUTE_PATHS.home} replace />;
  }

  const trimmedName = `${member.nickname ?? ''} ${member.last_name ?? ''}`.trim();
  const avatarName = trimmedName !== '' ? trimmedName : member.full_name;

  const extraMetadata = member.extra_metadata ?? {};
  // Filter out sunday keys for the general Additional Information section
  const generalMetadataEntries = Object.entries(extraMetadata).filter(
    ([key]) => !SUNDAY_KEYS.includes(key),
  );

  return (
    <AdminPageShell>
      <AdminPageShell.Header
        title="User Profile"
        description="View your details and event history."
      />

      <AdminPageShell.Content>
        <div className="space-y-6">
          <SectionCard
            title="Personal Details"
            headerAction={
              member.last_activity && (
                <Badge variant="outline">
                  Last Activity: {formatDateTime(member.last_activity)}
                </Badge>
              )
            }
          >
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
                {member.first_name && (
                  <div className="min-w-0">
                    <dt className="text-muted">First Name</dt>
                    <dd className="break-words font-medium text-text">{member.first_name}</dd>
                  </div>
                )}
                {member.last_name && (
                  <div className="min-w-0">
                    <dt className="text-muted">Last Name</dt>
                    <dd className="break-words font-medium text-text">{member.last_name}</dd>
                  </div>
                )}
                {member.nickname && (
                  <div className="min-w-0">
                    <dt className="text-muted">Nickname</dt>
                    <dd className="break-words font-medium text-text">{member.nickname}</dd>
                  </div>
                )}
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
                {member.phone && (
                  <div className="min-w-0">
                    <dt className="text-muted">Phone</dt>
                    <dd className="break-words font-medium text-text">{member.phone}</dd>
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

          <SectionCard title="Sunday Availability">
            <SundayAvailabilityDisplay metadata={extraMetadata} />
          </SectionCard>

          {generalMetadataEntries.length > 0 && (
            <SectionCard title="Additional Information">
              <dl className="grid min-w-0 grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                {generalMetadataEntries.map(([key, value]) => (
                  <div key={key} className="min-w-0">
                    <dt className="text-muted">{toTitleCase(key)}</dt>
                    <dd className="break-words font-medium text-text">{value}</dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          )}

          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'events' | 'service_attendance')}
          >
            <TabsList>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="service_attendance">Service Attendance</TabsTrigger>
            </TabsList>

            <TabsContent value="events">
              <SectionCard
                title={`Event History (${eventGroups.length})`}
                subtitle="All events you have registered for, sorted most recent first."
              >
                {historyQuery.isLoading && (
                  <p className="text-sm text-muted">Loading event history...</p>
                )}
                {historyQuery.isError && (
                  <p className="text-sm text-danger">Failed to load event history.</p>
                )}
                {!historyQuery.isLoading && !historyQuery.isError && eventGroups.length === 0 && (
                  <p className="text-sm text-muted">No events found.</p>
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
            </TabsContent>

            <TabsContent value="service_attendance">
              <ServiceAttendanceHistoryTab memberId={member.id} metadata={extraMetadata} />
            </TabsContent>
          </Tabs>
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
