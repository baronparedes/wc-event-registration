import { AdminPageShell, AdminSubNavLink } from '@/components/layout';
import { ROUTE_PATHS } from '@/config/constants';

export function ServiceNavigationLinks() {
  return (
    <AdminPageShell.SubNav>
      <AdminSubNavLink to={ROUTE_PATHS.adminServices}>Services</AdminSubNavLink>
      <AdminSubNavLink to={ROUTE_PATHS.adminServiceAttendanceData}>Attendance Data</AdminSubNavLink>
      <AdminSubNavLink to={ROUTE_PATHS.adminServiceAttendanceCommitment}>
        Commitment Dashboard
      </AdminSubNavLink>
      <AdminSubNavLink to={ROUTE_PATHS.adminServiceAttendanceMigration}>
        Attendance Migration
      </AdminSubNavLink>
    </AdminPageShell.SubNav>
  );
}
