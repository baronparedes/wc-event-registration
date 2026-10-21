import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import {
  type MemberDashboardData,
  computeMemberDashboardData,
  fetchActiveMembers,
} from '@/lib/domain/members';

export const ADMIN_MEMBERS_DASHBOARD_QUERY_KEY = ['admin-members-dashboard'] as const;

export function useAdminMembersDashboardQuery() {
  return useQuery<MemberDashboardData, Error>({
    queryKey: ADMIN_MEMBERS_DASHBOARD_QUERY_KEY,
    queryFn: async (): Promise<MemberDashboardData> => {
      const activeMembers = await fetchActiveMembers();
      return computeMemberDashboardData(activeMembers);
    },
    staleTime: QUERY_STALE_TIME_MS.adminList,
  });
}
