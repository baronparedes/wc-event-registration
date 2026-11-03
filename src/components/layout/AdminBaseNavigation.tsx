import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';

import { AdminPageShell, AdminSubNavLink } from './AdminPageShell';

export function AdminBaseNavigation() {
  const { can } = useAdminAuthQuery();
  const canReadAdminMemberData = can('canReadAdminMemberData');
  const canManageServices = can('canManageServices');
  const canWriteAdminData = can('canWriteAdminData');
  const canReadAdminData = can('canReadAdminData');

  return (
    <AdminPageShell.SubNav>
      <AdminSubNavLink to={ROUTE_PATHS.adminEvents}>Events</AdminSubNavLink>
      <AdminSubNavLink to={ROUTE_PATHS.adminForms}>Forms</AdminSubNavLink>
      {canReadAdminData && (
        <AdminSubNavLink to={ROUTE_PATHS.adminApprovals}>Approvals</AdminSubNavLink>
      )}
      {canReadAdminData && (
        <AdminSubNavLink to={ROUTE_PATHS.adminRecruitment}>Recruitment</AdminSubNavLink>
      )}
      {canReadAdminMemberData && (
        <AdminSubNavLink to={ROUTE_PATHS.adminMembers}>Members</AdminSubNavLink>
      )}
      {canManageServices && (
        <AdminSubNavLink to={ROUTE_PATHS.adminServices}>Services</AdminSubNavLink>
      )}
      {canWriteAdminData && (
        <AdminSubNavLink to={ROUTE_PATHS.adminSettings}>Settings</AdminSubNavLink>
      )}
    </AdminPageShell.SubNav>
  );
}
