import { useParams } from 'react-router-dom';

import { AdminPageShell } from '@/components/layout';
import { ROUTE_PATHS, UI_MESSAGES, toRoute } from '@/config/constants';
import { useAdminMemberQuery } from '@/hooks/domain/members';
import { MemberNavigationLinks } from '@/pages/admin/members/components/MemberNavigationLinks';
import { MemberOverviewCard } from '@/pages/admin/members/components/MemberOverviewCard';
import { ServiceAttendanceHistoryTab } from '@/pages/profile/components/ServiceAttendanceHistoryTab';

export function AdminMemberServiceAttendancePage() {
  const { id } = useParams<{ id: string }>();

  const memberQuery = useAdminMemberQuery(id, { includeInactive: true });

  if (!id) {
    return (
      <AdminPageShell>
        <AdminPageShell.Header title="Service Attendance History" />
        <AdminPageShell.Content>
          <p className="text-sm text-danger">Member ID is missing.</p>
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
        <AdminPageShell.Header title="Service Attendance History" />
        <AdminPageShell.Content>
          <p className="text-sm text-danger">{UI_MESSAGES.errors.memberNotFound}</p>
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
          { label: 'Service Attendance' },
        ]}
        navLinks={<MemberNavigationLinks memberId={id} />}
        title="Service Attendance History"
        description="Member's church service attendance and seat assignments."
      />

      <AdminPageShell.Content>
        <div className="space-y-6">
          <MemberOverviewCard member={member} />
          <ServiceAttendanceHistoryTab memberId={member.id} metadata={member.extra_metadata} />
        </div>
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
