import { AdminSubNavLink } from '@/components/layout';
import { toRoute } from '@/config/constants';

type MemberNavigationLinksProps = {
  memberId: string;
};

export function MemberNavigationLinks({ memberId }: MemberNavigationLinksProps) {
  return (
    <>
      <AdminSubNavLink to={toRoute('adminMemberDetail', { id: memberId })}>
        Member Profile
      </AdminSubNavLink>
      <AdminSubNavLink to={toRoute('adminMemberServiceAttendance', { id: memberId })}>
        Service Attendance
      </AdminSubNavLink>
      <AdminSubNavLink to={toRoute('adminMemberEventHistory', { id: memberId })}>
        Event History
      </AdminSubNavLink>
    </>
  );
}
