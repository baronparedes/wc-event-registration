import { AdminPageShell } from '@/components/layout';
import { ServiceNavigationLinks } from '@/pages/admin/services/components/ServiceNavigationLinks';

import { ServiceAttendanceMigrationPanel } from './components/ServiceAttendanceMigrationPanel';

export function AdminServiceAttendanceMigrationPage() {
  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Service Attendance Migration"
        description="Upload attendance CSV to migrate records and map tables to service layout seats."
      />
      <ServiceNavigationLinks />
      <AdminPageShell.Content className="mt-6">
        <ServiceAttendanceMigrationPanel />
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
