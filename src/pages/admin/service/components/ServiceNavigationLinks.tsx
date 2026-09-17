import { AdminPageShell, AdminSubNavLink } from '@/components/layout';
import { ROUTE_PATHS } from '@/config/constants';

export function ServiceNavigationLinks() {
  return (
    <AdminPageShell.SubNav>
      <AdminSubNavLink to={ROUTE_PATHS.adminServices}>Overview</AdminSubNavLink>
      <AdminSubNavLink to={ROUTE_PATHS.adminServiceAttendanceMigration}>
        Attendance Migration
      </AdminSubNavLink>
    </AdminPageShell.SubNav>
  );
}
