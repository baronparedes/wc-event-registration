import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { canAdminPerform } from '@/lib/domain/auth';

import { AdminPageShell, AdminSubNavLink } from './AdminPageShell';

export function AdminBaseNavigation() {
  const { data: authState } = useAdminAuthQuery();
  const canReadAdminMemberData = canAdminPerform(authState?.adminRole, 'canReadAdminMemberData');
  const canManageServices = canAdminPerform(authState?.adminRole, 'canManageServices');
  const canWriteAdminData = canAdminPerform(authState?.adminRole, 'canWriteAdminData');
  const canReadAdminData = canAdminPerform(authState?.adminRole, 'canReadAdminData');

  return (
    <AdminPageShell.SubNav>
      {canReadAdminData && (
        <AdminSubNavLink to={ROUTE_PATHS.adminApprovals}>Approvals</AdminSubNavLink>
      )}
      <AdminSubNavLink to={ROUTE_PATHS.adminEvents}>Events</AdminSubNavLink>
      <AdminSubNavLink to={ROUTE_PATHS.adminForms}>Forms</AdminSubNavLink>
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
