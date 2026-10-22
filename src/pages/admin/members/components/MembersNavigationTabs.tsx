import { useLocation, useNavigate } from 'react-router-dom';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { ROUTE_PATHS } from '@/config/constants';

export function MembersNavigationTabs() {
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = location.pathname.startsWith(ROUTE_PATHS.adminMembersDashboard)
    ? ROUTE_PATHS.adminMembersDashboard
    : ROUTE_PATHS.adminMembers;

  return (
    <Tabs value={activeTab} onValueChange={(path) => navigate(path)} className="print:hidden">
      <TabsList>
        <TabsTrigger value={ROUTE_PATHS.adminMembers}>Directory</TabsTrigger>
        <TabsTrigger value={ROUTE_PATHS.adminMembersDashboard}>Dashboard</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
