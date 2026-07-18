import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants/queryKeys';
import type { AttendanceSavedView } from '@/lib/domain/attendance-views';
import { supabase } from '@/lib/infrastructure/supabase';

/**
 * Fetches a single saved view by ID.
 */
export function useAttendanceSavedViewQuery(viewId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceSavedView(viewId),
    queryFn: async (): Promise<AttendanceSavedView> => {
      if (!viewId) throw new Error('View ID is required');

      const { data, error } = await supabase
        .from('attendance_saved_views')
        .select('*')
        .eq('id', viewId)
        .single();

      if (error) throw error;

      return data as AttendanceSavedView;
    },
    enabled: !!viewId,
    staleTime: 0,
  });
}
