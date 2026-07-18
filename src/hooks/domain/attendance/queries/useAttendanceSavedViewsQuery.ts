import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/config/constants/queryKeys';
import type { AttendanceSavedView } from '@/lib/domain/attendance-views';
import { supabase } from '@/lib/infrastructure/supabase';

/**
 * Fetches all saved views for a specific event.
 */
export function useAttendanceSavedViewsQuery(eventId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.adminAttendanceSavedViews(eventId),
    queryFn: async (): Promise<AttendanceSavedView[]> => {
      if (!eventId) throw new Error('Event ID is required');

      const { data, error } = await supabase
        .from('attendance_saved_views')
        .select('*')
        .eq('event_id', eventId)
        .order('name', { ascending: true });

      if (error) throw error;

      return (data || []) as AttendanceSavedView[];
    },
    enabled: !!eventId,
    staleTime: 0,
  });
}
