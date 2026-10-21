import { AdminPageShell, AdminSubNavLink } from '@/components/layout';
import { ROUTE_PATHS } from '@/config/constants';

export function MembersNavigationTabs() {
  return (
    <AdminPageShell.SubNav>
      <AdminSubNavLink to={ROUTE_PATHS.adminMembers}>Directory</AdminSubNavLink>
      <AdminSubNavLink to={ROUTE_PATHS.adminMembersDashboard}>Dashboard</AdminSubNavLink>
    </AdminPageShell.SubNav>
  );
}
