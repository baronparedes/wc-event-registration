import { useState } from 'react';

import { Navigate } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { Badge } from '@/components/ui';
import { Avatar } from '@/components/ui/Avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ROUTE_PATHS, UI_MESSAGES } from '@/config/constants';
import { useCurrentProfileQuery } from '@/hooks/domain/members';
import { useIsMobileViewport } from '@/hooks/utils';
import { formatDateTime } from '@/lib/infrastructure';
import { WelcomeHelloBanner } from '@/pages/home/components';

import { EventHistoryTab } from './components/EventHistoryTab';
import { MemberInfoTab } from './components/MemberInfoTab';
import { ServiceAttendanceHistoryTab } from './components/ServiceAttendanceHistoryTab';

export function ProfilePage() {
  const profileQuery = useCurrentProfileQuery();
  const isMobile = useIsMobileViewport();
  const member = profileQuery.data;

  const [activeTab, setActiveTab] = useState<'member_info' | 'events' | 'service_attendance'>(
    'member_info',
  );

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

  return (
    <AdminPageShell>
      <AdminPageShell.Content>
        <WelcomeHelloBanner translucentBackground />
        <div className="relative z-10 -mt-14 sm:-mt-44 md:-mt-52 mb-6 flex flex-col items-center text-center pointer-events-none">
          <Avatar
            name={avatarName}
            avatarObjectKey={member.avatar_object_key}
            size={isMobile ? 'lg' : '2xl'}
            className="ring-1 ring-surface shadow-md pointer-events-auto"
          />
          <h1 className="text-2xl font-bold text-text pt-3 sm:text-3xl pointer-events-auto">
            {avatarName}
          </h1>
          <p className="text-muted text-sm mt-1 pointer-events-auto">
            {member.role} • {member.category} • {member.member_id}
          </p>
          {member.last_activity && (
            <div className="mt-2.5 pointer-events-auto">
              <Badge>Last Activity: {formatDateTime(member.last_activity)}</Badge>
            </div>
          )}
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(val) =>
            setActiveTab(val as 'member_info' | 'events' | 'service_attendance')
          }
        >
          <TabsList>
            <TabsTrigger value="member_info">Info</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="service_attendance">Commitments</TabsTrigger>
          </TabsList>
          <TabsContent value="member_info">
            <MemberInfoTab member={member} />
          </TabsContent>

          <TabsContent value="events">
            <EventHistoryTab memberId={member.id} />
          </TabsContent>

          <TabsContent value="service_attendance">
            <ServiceAttendanceHistoryTab memberId={member.id} metadata={extraMetadata} />
          </TabsContent>
        </Tabs>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
