import { Layers } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { AdminBaseNavigation, AdminPageShell } from '@/components/layout';
import { Button, EmptyState } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';

export function AdminServicesPage() {
  const navigate = useNavigate();

  return (
    <AdminPageShell wide>
      <AdminPageShell.Header
        title="Manage Services"
        description="Configure services, layouts, seating, and attendance."
      />
      <AdminBaseNavigation />
      <AdminPageShell.Content className="mt-6">
        <EmptyState
          icon={<Layers className="h-8 w-8" />}
          title="Service Management Coming Soon"
          description="Service layout configurations and attendance controls are currently under development. You can use Attendance Migration to import legacy service records."
          action={
            <Button
              type="button"
              variant="default"
              onClick={() => navigate(ROUTE_PATHS.adminServiceAttendanceMigration)}
            >
              Go to Attendance Migration
            </Button>
          }
        />
      </AdminPageShell.Content>
    </AdminPageShell>
  );
}
