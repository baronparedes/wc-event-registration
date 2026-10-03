import { useQuery } from '@tanstack/react-query';

import { QUERY_STALE_TIME_MS } from '@/config/constants';
import { supabase } from '@/lib/infrastructure';

export function useMembersLoginCountQuery() {
  return useQuery({
    queryKey: ['members-login-count'] as const,
    queryFn: async () => {
      // Get the date 12 weeks ago (approximately 3 months / 12 Sundays)
      const twelveWeeksAgo = new Date();
      twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 12 * 7);
      const startDate = twelveWeeksAgo.toISOString().split('T')[0];

      // Fetch service attendance records from the last 12 weeks
      const { data, error } = await supabase
        .from('service_attendance')
        .select('user_id')
        .gte('service_date', startDate)
        .eq('is_walk_in', false);

      if (error) {
        throw new Error(`Failed to fetch login counts: ${error.message}`);
      }

      // Group by user_id and count logins
      const countMap = new Map<string, number>();
      for (const record of data ?? []) {
        if (record.user_id) {
          const count = countMap.get(record.user_id) || 0;
          countMap.set(record.user_id, count + 1);
        }
      }

      return countMap;
    },
    staleTime: QUERY_STALE_TIME_MS.oneDay,
  });
}
