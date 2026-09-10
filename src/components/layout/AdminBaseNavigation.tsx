import { ROUTE_PATHS } from '@/config/constants';
import { useAdminAuthQuery } from '@/hooks/domain/auth';
import { canAdminPerform } from '@/lib/domain/auth';

import { AdminPageShell, AdminSubNavLink } from './AdminPageShell';

export function AdminBaseNavigation() {
  const { data: authState } = useAdminAuthQuery();
  const canReadAdminMemberData = canAdminPerform(authState?.adminRole, 'canReadAdminMemberData');
  const canManageAdminRoles = canAdminPerform(authState?.adminRole, 'canManageAdminRoles');

  return (
    <AdminPageShell.SubNav>
      <AdminSubNavLink to={ROUTE_PATHS.adminEvents}>Events</AdminSubNavLink>
      <AdminSubNavLink to={ROUTE_PATHS.adminForms}>Forms</AdminSubNavLink>
      {canReadAdminMemberData && (
        <AdminSubNavLink to={ROUTE_PATHS.adminMembers}>Members</AdminSubNavLink>
      )}
      {canManageAdminRoles && (
        <AdminSubNavLink to={ROUTE_PATHS.adminUserRoles}>User Roles</AdminSubNavLink>
      )}
    </AdminPageShell.SubNav>
  );
}
