import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/infrastructure';

export type BroadcastCampaignStat = {
  id: string;
  title: string;
  message: string;
  target_type: 'all' | 'role' | 'user';
  target_role: string | null;
  created_at: string;
  total_recipients: number;
  read_count: number;
};

export type BroadcastDashboardStats = {
  total_users: number;
  subscribed_users: number;
  campaigns: BroadcastCampaignStat[];
};

export const useBroadcastDashboardStatsQuery = () => {
  return useQuery({
    queryKey: ['admin', 'broadcast-dashboard-stats'],
    queryFn: async (): Promise<BroadcastDashboardStats> => {
      const { data, error } = await supabase.rpc('get_broadcast_dashboard_stats');
      if (error) throw error;
      return data as BroadcastDashboardStats;
    },
  });
};
